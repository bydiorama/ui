"""A lossless 2× still of the film at page time t: a fresh render, not a frame pulled from the mp4.

usage: python still.py <page.html> <out.png> --at 18.5 [--light] [--size 1600x900] [--slow 8] [--k 2]

Same init as render.py; runDemo() is started (not awaited), the page runs to t, then transitions are frozen with
playbackRate 0 before the screenshot — a 3200 px screenshot is slow enough to catch a blend otherwise.
The page has no cursor, so there is nothing to hide.
"""
import argparse, asyncio, sys
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from common import init_script, parse_size  # noqa: E402


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page"); ap.add_argument("out")
    ap.add_argument("--at", type=float, required=True)
    ap.add_argument("--light", action="store_true")
    ap.add_argument("--size", default="1600x900")
    ap.add_argument("--slow", type=float, default=8)
    ap.add_argument("--k", type=float, default=2)
    a = ap.parse_args()
    W, H = parse_size(a.size)
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={"width": int(W * a.k), "height": int(H * a.k)}, device_scale_factor=1)
        await ctx.add_init_script(script=init_script(a.slow, a.k, a.light))
        p = await ctx.new_page()
        await p.goto(Path(a.page).resolve().as_uri() + "#demo")
        await p.evaluate("document.fonts.ready.then(() => true)")
        await p.wait_for_timeout(500)
        cdp = await ctx.new_cdp_session(p)
        await cdp.send("Animation.enable")
        await cdp.send("Animation.setPlaybackRate", {"playbackRate": 1 / a.slow})
        await p.evaluate("() => { window.runDemo(); }")
        await p.wait_for_timeout(a.at * a.slow * 1000)
        await cdp.send("Animation.setPlaybackRate", {"playbackRate": 0})
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        await p.screenshot(path=a.out)
        print(a.out)
        await b.close()


asyncio.run(main())
