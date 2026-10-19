"""Loop seam + contact sheet for a rendered clip.

usage: python check.py <clip.mp4> [--sheet out.png] [--at 2.6,6.2,…]

seam_diff = mean |first − last| frame, 0–255. Accept < 0.5; above that the run does not return to its first frame
(fix the page, not the encode). The sheet shows 8 evenly spaced frames, or the given times. The number cannot see a
wrong state, so look at the sheet too.
"""
import argparse, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from common import FFMPEG  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("clip"); ap.add_argument("--sheet"); ap.add_argument("--at"); ap.add_argument("--cols", type=int, default=4)
a = ap.parse_args()
tmp = Path(tempfile.mkdtemp())


def grab(args, out):
    subprocess.run([FFMPEG, "-v", "error", "-y", *args, "-frames:v", "1", str(out)], check=True)
    return np.asarray(Image.open(out).convert("RGB"), dtype=np.float32)


probe = subprocess.run([FFMPEG, "-hide_banner", "-i", a.clip, "-map", "0:v", "-f", "null", "-"], capture_output=True, text=True).stderr
dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe)
dur = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3])
nframes = re.findall(r"frame=\s*(\d+)", probe)
size = re.search(r", (\d{3,5})x(\d{3,5})", probe)
first = grab(["-i", a.clip, "-vf", r"select=eq(n\,0)"], tmp / "first.png")
last = grab(["-sseof", "-0.05", "-i", a.clip], tmp / "last.png")
seam = float(np.abs(first - last).mean())
print(f"{Path(a.clip).name}: {size[1]}x{size[2]} frames={nframes[-1] if nframes else '?'} dur={dur:.2f}s seam_diff={seam:.3f}")

if a.sheet:
    times = [float(t) for t in a.at.split(",")] if a.at else [dur * (i + 0.5) / 8 for i in range(8)]
    tiles = []
    for i, t in enumerate(times):
        p = tmp / f"t{i}.png"
        subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", a.clip, "-frames:v", "1", str(p)], check=True)
        tiles.append(Image.open(p).convert("RGB"))
    tw, th = tiles[0].size
    cols = min(a.cols, len(tiles)); rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (tw * cols + 8 * (cols - 1), th * rows + 8 * (rows - 1)), (128, 128, 128))
    for i, im in enumerate(tiles):
        sheet.paste(im, ((i % cols) * (tw + 8), (i // cols) * (th + 8)))
    scale = min(1, 2400 / sheet.width)
    sheet = sheet.resize((int(sheet.width * scale), int(sheet.height * scale)), Image.LANCZOS)
    sheet.save(a.sheet)
    print("sheet", a.sheet, "at", ", ".join(f"{t:.2f}" for t in times))
