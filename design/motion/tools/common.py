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
([slow, k, light]) => {
  window.__RENDER = true; window.__SLOW = slow; window.__STAGE_SCALE = k; window.__PAD = 0;
  if (light) window.__LIGHT = true;
  const o = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => o(f, (Number(ms) || 0) * slow, ...a);
}
"""


def init_script(slow, k, light):
    return f"({INIT})({[slow, k, bool(light)]!r});".replace("True", "true").replace("False", "false")


def parse_size(s):
    w, h = (int(v) for v in s.lower().split("x"))
    return w, h
