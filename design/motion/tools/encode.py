"""Retime captured frames to real time and encode a 60 fps H.264 loop.

usage: python encode.py <capture dir> <out.mp4> [--size 1600x900]

Each frame lasts (next timestamp − its own) ÷ slow; the last one lasts until tEnd (the tail hold). Full-frame films
need no crop or overlay: the page draws its own ground and vignette under the UI, so this only scales 2× → 1×.
Colour is tagged BT.709 and converted with that matrix, so the light ground stays #FDFCFB rather than drifting warm.
"""
import argparse, json, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import FFMPEG, parse_size  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("cap"); ap.add_argument("out")
ap.add_argument("--size", default=None)
a = ap.parse_args()
cap = Path(a.cap)
m = json.loads((cap / "meta.json").read_text())
slow = m["slow"]
W, H = parse_size(a.size) if a.size else m["size"]
fr = sorted(m["frames"], key=lambda f: f["t"])
lines = []
for i, f in enumerate(fr):
    d = (fr[i + 1]["t"] - f["t"]) / slow if i + 1 < len(fr) else max(1 / 60, (m["tEnd"] - f["t"]) / slow)
    lines.append(f"file 'frames/{f['name']}'\nduration {max(d, 0.0005):.6f}")
lines.append(f"file 'frames/{fr[-1]['name']}'")   # concat drops the last duration unless the file is repeated
(cap / "list.txt").write_text("\n".join(lines))
vf = f"scale={W}:{H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,fps=60,format=yuv420p"
Path(a.out).parent.mkdir(parents=True, exist_ok=True)
subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(cap / "list.txt"), "-vf", vf,
                "-r", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "15",
                "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                "-movflags", "+faststart", a.out], check=True)
print(a.out)
