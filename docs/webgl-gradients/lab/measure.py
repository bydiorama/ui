"""Banding measure for the ground lab. Run with: python3 -I measure.py

For each screenshot in .out/, inside a 720x240 band clear of the copy and the
edges: the number of distinct luminance values, and the run length (px) of
identical neighbouring pixels along rows that change at all. Wide runs on a
gradient are bands. Needs Pillow and numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).parent / ".out"
print(f"{'tile':22s}{'levels':>8s}{'p95 run':>9s}{'max run':>9s}")
for png in sorted(OUT.glob("*.png")):
    r = np.asarray(Image.open(png).convert("RGB")).astype(np.int32)[60:300, 120:840]
    levels = len(np.unique((r * [2126, 7152, 722]).sum(-1) // 10000))
    runs = []
    for row in r:
        changes = np.flatnonzero(np.any(row[1:] != row[:-1], axis=-1))
        if len(changes):
            runs += list(np.diff(np.r_[-1, changes, len(row) - 1]))
    runs = np.array(runs)
    print(f"{png.stem:22s}{levels:8d}{np.percentile(runs, 95):9.0f}{runs.max():9d}")
