"""A lossless 2× still of the film at page time t: a fresh render, not a frame pulled from the mp4.

usage: python still.py <page.html> <out.png> --at 18.5 [--light] [--size 1600x900] [--slow 8] [--k 2]
                        [--compose 44,109] [--run main|composition] [--snippet NAME]

Same init as render.py; the run is started (not awaited), the page runs to t, then transitions are frozen with
playbackRate 0 before the screenshot — a 3200 px screenshot is slow enough to catch a blend otherwise.
A page with a #cursor element has it hidden: in a still it reads as a screenshot of someone mid-click.
--snippet frames the still exactly like its clip, at 2× the --size output: the same window maths, the overhang
filled from the edge pixels (np.pad mode="edge" — a flat fill showed a band), the same dim + vignette at 2×.
"""
import argparse, asyncio, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from common import (PAD, RUNS, STAGE, font_guard, init_script, parse_compose, parse_size,  # noqa: E402
                    snippet_mask, snippet_window)


def frame_snippet(shot, crop, W, H, light):
    img = np.asarray(Image.open(shot).convert("RGB"))
    CH, CW = img.shape[:2]
    (cx, cy, cw, ch), focus = snippet_window(W, H, crop)
    x0, y0, x1, y1 = int(round(cx)), int(round(cy)), int(round(cx + cw)), int(round(cy + ch))
    L, T, R, B = max(0, -x0), max(0, -y0), max(0, x1 - CW), max(0, y1 - CH)
    if L or T or R or B:
        img = np.pad(img, ((T, B), (L, R), (0, 0)), mode="edge")
    win = Image.fromarray(img[y0 + T:y1 + T, x0 + L:x1 + L]).resize((W, H), Image.LANCZOS)
    mask = snippet_mask(W, H, focus, light)
    return Image.alpha_composite(win.convert("RGBA"), mask).convert("RGB")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page"); ap.add_argument("out")
    ap.add_argument("--at", type=float, required=True)
    ap.add_argument("--light", action="store_true")
    ap.add_argument("--size", default="1600x900")
    ap.add_argument("--slow", type=float, default=8)
    ap.add_argument("--k", type=float, default=2)
    ap.add_argument("--compose", default=None)
    ap.add_argument("--run", choices=sorted(RUNS), default="main")
    ap.add_argument("--snippet", default=None)
    a = ap.parse_args()
    W, H = parse_size(a.size)
    VW, VH = (STAGE[0] + 2 * PAD, STAGE[1] + 2 * PAD) if a.snippet else (W, H)
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={"width": int(VW * a.k), "height": int(VH * a.k)}, device_scale_factor=1)
        await ctx.add_init_script(script=init_script(a.slow, a.k, a.light, parse_compose(a.compose), PAD if a.snippet else 0))
        p = await ctx.new_page()
        await p.goto(Path(a.page).resolve().as_uri() + "#demo")
        await p.evaluate("document.fonts.ready.then(() => true)")
        await p.wait_for_timeout(500)
        await font_guard(p, "after load")
        crop = None
        if a.snippet:
            await p.evaluate("window.showIntroInstant()")
            await p.wait_for_timeout(1500)
            crop = await p.evaluate("(n) => window.snippetRect(n, 40)", a.snippet)
        cdp = await ctx.new_cdp_session(p)
        await cdp.send("Animation.enable")
        await cdp.send("Animation.setPlaybackRate", {"playbackRate": 1 / a.slow})
        if a.snippet:
            await p.evaluate("(n) => { window.runSnippet(n); }", a.snippet)
        else:
            await p.evaluate(f"() => {{ {RUNS[a.run]}; }}")
        await p.wait_for_timeout(a.at * a.slow * 1000)
        await cdp.send("Animation.setPlaybackRate", {"playbackRate": 0})
        await p.evaluate("() => { const c = document.getElementById('cursor'); if (c) { c.style.transition = 'none'; c.style.opacity = '0'; } }")
        await font_guard(p, "at the still")
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        if a.snippet:
            shot = Path(tempfile.mkdtemp()) / "shot.png"
            await p.screenshot(path=str(shot))
            frame_snippet(shot, crop, int(W * a.k), int(H * a.k), a.light).save(a.out)
        else:
            await p.screenshot(path=a.out)
        print(a.out)
        await b.close()


asyncio.run(main())
