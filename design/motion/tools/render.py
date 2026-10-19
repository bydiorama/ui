"""Capture a demo page's runDemo() as screencast frames, slowed ×8 and drawn at 2×.

usage: python render.py <page.html> <capture dir> [--light] [--size 1600x900] [--slow 8] [--k 2]
                         [--compose 44,109] [--run main|composition]

Writes <capture dir>/frames/*.jpg and meta.json (frame timestamps, tEnd, slow, size) for encode.py.
Keep the capture dir OUT of the repo: a 21 s film is several thousand 2× JPEGs.
--compose puts the page in composition mode with its screen at X,Y on a --size artboard (ui-demo-page __COMPOSE).
--snippet NAME captures one component beat (runSnippet): the stage plus PAD px of ground, settled first
(showIntroInstant), with the focus rect (snippetRect, pad 40) recorded in meta.json for encode.py's framing.
"""
import argparse, asyncio, base64, json, shutil, sys, time
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from common import PAD, RUNS, STAGE, font_guard, init_script, parse_compose, parse_size  # noqa: E402


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page"); ap.add_argument("out")
    ap.add_argument("--light", action="store_true")
    ap.add_argument("--size", default="1600x900")
    ap.add_argument("--slow", type=float, default=8)
    ap.add_argument("--k", type=float, default=2)
    ap.add_argument("--compose", default=None)
    ap.add_argument("--run", choices=sorted(RUNS), default="main")
    ap.add_argument("--snippet", default=None)
    a = ap.parse_args()
    W, H = (STAGE[0] + 2 * PAD, STAGE[1] + 2 * PAD) if a.snippet else parse_size(a.size)
    out = Path(a.out); shutil.rmtree(out, ignore_errors=True); (out / "frames").mkdir(parents=True)

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={"width": int(W * a.k), "height": int(H * a.k)}, device_scale_factor=1)
        await ctx.add_init_script(script=init_script(a.slow, a.k, a.light, parse_compose(a.compose), PAD if a.snippet else 0))
        p = await ctx.new_page()
        errors = []
        p.on("pageerror", lambda e: errors.append(str(e)))
        p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await p.goto(Path(a.page).resolve().as_uri() + "#demo")
        await p.evaluate("document.fonts.ready.then(() => true)")
        await p.wait_for_timeout(500)
        families = await font_guard(p, "after load")
        crop = None
        if a.snippet:   # snippets start composed, not mid-intro
            await p.evaluate("window.showIntroInstant()")
            await p.wait_for_timeout(1500)
            crop = await p.evaluate("(n) => window.snippetRect(n, 40)", a.snippet)

        cdp = await ctx.new_cdp_session(p)
        await cdp.send("Animation.enable")
        await cdp.send("Animation.setPlaybackRate", {"playbackRate": 1 / a.slow})
        frames = []

        def on_frame(f):
            name = f"f{len(frames):06d}.jpg"
            (out / "frames" / name).write_bytes(base64.b64decode(f["data"]))
            frames.append({"name": name, "t": f["metadata"]["timestamp"]})
            asyncio.ensure_future(cdp.send("Page.screencastFrameAck", {"sessionId": f["sessionId"]}))

        cdp.on("Page.screencastFrame", on_frame)
        await cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 95,
                                                "maxWidth": int(W * a.k), "maxHeight": int(H * a.k), "everyNthFrame": 1})
        await p.wait_for_timeout(300)
        t0 = time.time()
        if a.snippet:
            await p.evaluate("(n) => window.runSnippet(n)", a.snippet)
        else:
            await p.evaluate(RUNS[a.run])
        # The screencast emits nothing while the page is static, so the closing hold only exists as this timestamp.
        t_end = time.time()
        await p.wait_for_timeout(200)
        await cdp.send("Page.stopScreencast")
        await asyncio.sleep(0.3)
        await font_guard(p, "after the run")
        meta = {"frames": frames, "slow": a.slow, "tEnd": t_end, "light": a.light, "size": [W, H], "k": a.k,
                "crop": crop, "snippet": a.snippet}
        (out / "meta.json").write_text(json.dumps(meta))
        print(json.dumps({"out": str(out), "frames": len(frames), "realSeconds": round(time.time() - t0, 1),
                          "filmSeconds": round((t_end - t0) / a.slow, 2), "crop": crop, "fonts": families, "errors": errors}))
        await b.close()


asyncio.run(main())
