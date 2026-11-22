"""Banding and contrast measure for the ground lab. Run with: python3 -I measure.py

Banding, for each screenshot in .out/, inside a 720x240 band clear of the copy
and the edges: the number of distinct luminance values, and the run length
(px) of identical neighbouring pixels along rows that change at all. Wide runs
on a gradient are bands.

Contrast, from the copy-free screenshot of the same tile in .out/bg/: the WCAG
ratio of the muted ink (theme zero's --ui-text-muted for the tile's scheme)
against the ground inside the copy's box, at the box's 1st-percentile pixel
(worst case, ignoring single dither pixels). Body text needs 4.5.

Needs Pillow and numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).parent / ".out"
MUTED = {"dark": "#A69F98", "light": "#69635D", "pale-light": "#6B5D3F", "pale-dark": "#A89E86"}
COPY_BOX = (slice(446, 496), slice(48, 370))  # rows, cols: the Ground story's copy
TOP_COPY_BOX = (slice(44, 94), slice(48, 370))  # a look whose copy sits top left
import json
_copy = OUT / "looks-copy.json"
COPY_AT = json.loads(_copy.read_text()) if _copy.exists() else {}


def luminance(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return lin @ [0.2126, 0.7152, 0.0722]


def contrast(a, b):
    hi, lo = np.maximum(a, b), np.minimum(a, b)
    return (hi + 0.05) / (lo + 0.05)


print(f"{'tile':24s}{'levels':>8s}{'p95 run':>9s}{'max run':>9s}{'muted ink':>11s}")
for png in sorted(OUT.glob("*.png")):
    if png.stem.startswith("sheet"):
        continue
    r = np.asarray(Image.open(png).convert("RGB")).astype(np.int32)[60:300, 120:840]
    levels = len(np.unique((r * [2126, 7152, 722]).sum(-1) // 10000))
    runs = []
    for row in r:
        changes = np.flatnonzero(np.any(row[1:] != row[:-1], axis=-1))
        if len(changes):
            runs += list(np.diff(np.r_[-1, changes, len(row) - 1]))
    runs = np.array(runs)
    ratio = ""
    bg = OUT / "bg" / png.name
    if bg.exists():
        scheme = next((s for s in ("pale-light", "pale-dark") if png.stem.endswith(s)), "light" if "light" in png.stem else "dark")
        ink = luminance([int(MUTED[scheme][i : i + 2], 16) for i in (1, 3, 5)])
        region = TOP_COPY_BOX if COPY_AT.get(png.stem) == "top" else COPY_BOX
        box = luminance(np.asarray(Image.open(bg).convert("RGB"))[region].reshape(-1, 3))
        ratio = f"{np.percentile(contrast(ink, box), 1):.2f}"
    print(f"{png.stem:24s}{levels:8d}{np.percentile(runs, 95):9.0f}{runs.max():9d}{ratio:>11s}")
