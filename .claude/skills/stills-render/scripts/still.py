# usage: python3 -I still.py <dir> <outdir> — same framing as compose.py, at 2x, lossless PNG
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
d, outd = sys.argv[1], sys.argv[2]
def smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def vignette(W, H, strength, inner, span):
    y, x = np.mgrid[0:H, 0:W]; r = np.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2))
    return strength * smooth((r - inner) / span)
for sp in json.load(open(f"{d}/raw.json")):
    im = Image.open(f"{d}/raw-{sp['name']}.png").convert("RGB"); LIGHT = sp.get("light")
    if sp.get("comp"):
        W, H = sp["size"][0] * 2, sp["size"][1] * 2; out = im.resize((W, H), Image.LANCZOS)   # vignette is in-page
    else:
        W, H = 2048, 1536; c = sp["crop"]; bx, by, bw, bh = c["x"], c["y"], c["w"], c["h"]
        z = min(0.60 * W / bw, 0.84 * H / bh); cw, ch = W / z, H / z
        cx, cy = bx + bw / 2 - cw / 2, by + bh / 2 - ch / 2
        # framing past the capture continues the page's own edge colour, so no band appears
        src = np.asarray(im); iH, iW = src.shape[:2]; X0, Y0 = int(round(cx)), int(round(cy)); X1, Y1 = X0 + int(cw), Y0 + int(ch)
        L, T, R, B = max(0, -X0), max(0, -Y0), max(0, X1 - iW), max(0, Y1 - iH)
        src = np.pad(src, ((T, B), (L, R), (0, 0)), mode="edge")
        out = Image.fromarray(src[Y0 + T:Y1 + T, X0 + L:X1 + L]).resize((W, H), Image.LANCZOS)
        rw, rh = bw * z, bh * z; x0, y0 = (W - rw) / 2, (H - rh) / 2
        dim = Image.new("L", (W, H), int(255 * (0.55 if LIGHT else 0.46)))
        ImageDraw.Draw(dim).rounded_rectangle([x0, y0, x0 + rw, y0 + rh], radius=int(min(56, rh / 3)), fill=0)
        dim = np.asarray(dim.filter(ImageFilter.GaussianBlur(44)), dtype=np.float32) / 255
        vig = vignette(W, H, 0.05 if LIGHT else 0.62, 0.6 if LIGHT else 0.55, 0.7 if LIGHT else 0.75)
        a = np.asarray(out, dtype=np.float32)
        if LIGHT:
            a = a * (1 - dim[..., None]) + np.array([248, 246, 243]) * dim[..., None]
            a = a * (1 - vig[..., None]) + np.array([29, 27, 25]) * vig[..., None]
        else:
            al = 1 - (1 - dim) * (1 - vig); a = a * (1 - al[..., None])
        out = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    out.save(f"{outd}/{sp['name']}.png", optimize=True); print(sp["name"], out.size)
