"""Shared bits of the motion tools: the ffmpeg binary and the init script every capture runs before the page loads.

Python port of the ui-video-render / ui-stills-render reference scripts (render.mjs, still.mjs). This Mac had no
Node or ffmpeg, so the pipeline runs on a venv instead: playwright, pillow, numpy and imageio-ffmpeg, which bundles
an ffmpeg build with libx264. The mechanics are unchanged; see the skills for why each one exists.
"""
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Slow JS time ×slow (wrapped setTimeout) — CSS/WAAPI time is slowed separately through CDP — and draw the stage at
# k× because the screencast captures CSS px, not device px.
INIT = """
([slow, k, light, compose, pad]) => {
  window.__RENDER = true; window.__SLOW = slow; window.__STAGE_SCALE = k; window.__PAD = pad * k;
  if (light) window.__LIGHT = true;
  if (compose) window.__COMPOSE = { x: compose[0], y: compose[1], k };   // screen offset in artboard px
  const o = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => o(f, (Number(ms) || 0) * slow, ...a);
}
"""


def init_script(slow, k, light, compose=None, pad=0):
    import json
    return f"({INIT})({json.dumps([slow, k, bool(light), compose, pad])});"


# Snippet captures draw the 1512×982 stage with PAD px of the page's own ground around it, so a focus window near
# the screen's edge still has real pixels to show (ui-video-render: render.mjs).
STAGE = (1512, 982)
PAD = 120


def snippet_mask(W, H, rect, light=False):
    """The snippet overlay at W×H: a feathered rounded dim around the focus rect, combined with a radial vignette.
    dark: black, dim 0.46 + vignette 0.62 · light: wash toward the ground (0.55) + a 0.05 ink vignette.
    Returns an RGBA PIL image (ui-video-render compose.py, in numpy)."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    x0, y0, rw, rh = rect
    dim = Image.new("L", (W, H), int(255 * (0.55 if light else 0.46)))
    ImageDraw.Draw(dim).rounded_rectangle([x0, y0, x0 + rw, y0 + rh], radius=int(min(28 * W / 1024, rh / 3)), fill=0)
    d = np.asarray(dim.filter(ImageFilter.GaussianBlur(22 * W / 1024)), dtype=np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = np.clip((np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.6) / 0.7, 0, 1)
    v = (0.05 if light else 0.62) * t * t * (3 - 2 * t)
    out = np.zeros((H, W, 4), dtype=np.float32)
    if light:   # wash toward the warm ground, then the ink vignette composited OVER it
        a = v + d * (1 - v)
        rgb = (np.array([29, 27, 25]) * v[..., None] + np.array([248, 246, 243]) * (d * (1 - v))[..., None]) / np.maximum(a[..., None], 1e-6)
        out[..., :3], out[..., 3] = rgb, a
    else:
        out[..., 3] = 1 - (1 - d) * (1 - v)
    return Image.fromarray(np.clip(out * [1, 1, 1, 255], 0, 255).astype("uint8"), "RGBA")


def snippet_window(W, H, crop, max_w=0.60, max_h=0.84):
    """Where the W×H output looks in capture px: z = min(60% W / crop w, 84% H / crop h), centred on the crop.
    Returns (window x, y, w, h in capture px; focus rect in output px)."""
    bx, by, bw, bh = crop["x"], crop["y"], crop["w"], crop["h"]
    z = min(max_w * W / bw, max_h * H / bh)
    cw, ch = W / z, H / z
    cx, cy = bx + bw / 2 - cw / 2, by + bh / 2 - ch / 2
    rw, rh = bw * z, bh * z
    return (cx, cy, cw, ch), ((W - rw) / 2, (H - rh) / 2, rw, rh)


def parse_compose(s):
    """'44,109' → [44, 109]: where the screen sits on the composition artboard (ui-demo-page's __COMPOSE)."""
    return [float(v) for v in s.split(",")] if s else None


# Font guard. A page may load a face over the network (the Daylight page takes Inter from Google Fonts, in
# subsets that load lazily as new glyphs appear). A dropped connection mid-capture logged ERR_INTERNET_DISCONNECTED
# once and nothing else: a fallback face at small sizes passes a visual check. So every capture asserts that each
# declared family has a loaded face and none errored — after load, and again after the run.
FONT_STATUS = """() => { const fam = {}; for (const f of document.fonts) { const k = f.family.replace(/["']/g, "");
  (fam[k] = fam[k] || []).push(f.status); } return fam; }"""


async def font_guard(page, when):
    fam = await page.evaluate(FONT_STATUS)
    bad = {k: v for k, v in fam.items() if "error" in v or "loaded" not in v}
    if bad:
        raise SystemExit(f"font guard ({when}): {bad}")
    return sorted(fam)


# What a capture runs: the page's whole walkthrough, or its composition script.
RUNS = {"main": "window.runDemo()", "composition": "window.runComposition('landscape')"}


def parse_size(s):
    w, h = (int(v) for v in s.lower().split("x"))
    return w, h
