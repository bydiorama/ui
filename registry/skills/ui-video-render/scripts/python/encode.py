"""Retime captured frames to real time and encode a 60 fps H.264 loop.

usage: python encode.py <capture dir> <out.mp4> [--size 1600x900]

Each frame lasts (next timestamp − its own) ÷ slow; the last one lasts until tEnd (the tail hold). Full-frame films
need no crop or overlay: the page draws its own ground and vignette under the UI, so this only scales 2× → 1×.
Snippet captures (render.py --snippet) are framed instead: the focus rect at ≤60% width / ≤84% height, the window
centred on it, its overhang filled by smearing the page's own edge pixels, and the dim + vignette overlay on top
(ui-video-render compose.py). --size is then the OUTPUT size (default 1024x768, the skill's snippet format).
Colour is tagged BT.709 and converted with that matrix, so the light ground stays #FDFCFB rather than drifting warm.
"""
import argparse, json, math, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import FFMPEG, parse_size, snippet_mask, snippet_window  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("cap"); ap.add_argument("out")
ap.add_argument("--size", default=None)
a = ap.parse_args()
cap = Path(a.cap)
m = json.loads((cap / "meta.json").read_text())
slow, crop = m["slow"], m.get("crop")
W, H = parse_size(a.size) if a.size else ((1024, 768) if crop else m["size"])
fr = sorted(m["frames"], key=lambda f: f["t"])
lines = []
for i, f in enumerate(fr):
    d = (fr[i + 1]["t"] - f["t"]) / slow if i + 1 < len(fr) else max(1 / 60, (m["tEnd"] - f["t"]) / slow)
    lines.append(f"file 'frames/{f['name']}'\nduration {max(d, 0.0005):.6f}")
lines.append(f"file 'frames/{fr[-1]['name']}'")   # concat drops the last duration unless the file is repeated
(cap / "list.txt").write_text("\n".join(lines))
tail = f"scale={W}:{H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,fps=60"
inputs = ["-f", "concat", "-safe", "0", "-i", str(cap / "list.txt")]
if crop:
    CW, CH = (round(v * m["k"]) for v in m["size"])
    (cx, cy, cw, ch), focus = snippet_window(W, H, crop)
    snippet_mask(W, H, focus, m.get("light")).save(cap / "mask.png")
    L, T = max(0, math.ceil(-cx)), max(0, math.ceil(-cy))
    R, B = max(0, math.ceil(cx + cw - CW)), max(0, math.ceil(cy + ch - CH))
    # where the window leaves the capture, continue the page's own edge pixels: a flat fill showed as a band
    pre = (f"pad={CW + L + R}:{CH + T + B}:{L}:{T}:black,fillborders=left={L}:right={R}:top={T}:bottom={B}:mode=smear,"
           if (L or T or R or B) else "")
    vf = ["-filter_complex", f"[0:v]{pre}crop={int(cw)}:{int(ch)}:{int(cx + L)}:{int(cy + T)},{tail}[v];"
                             f"[v][1:v]overlay=0:0:format=auto,format=yuv420p"]
    inputs += ["-i", str(cap / "mask.png")]
else:
    vf = ["-vf", f"{tail},format=yuv420p"]
Path(a.out).parent.mkdir(parents=True, exist_ok=True)
subprocess.run([FFMPEG, "-v", "error", "-y", *inputs, *vf,
                "-r", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "15",
                "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                "-movflags", "+faststart", a.out], check=True)
print(a.out)
