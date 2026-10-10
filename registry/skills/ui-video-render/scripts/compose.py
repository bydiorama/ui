# usage: python3 -I compose.py <cap dir> <out mp4>
# composition clips: scale the 2x capture to the artboard size + radial vignette.
# component snippets: frame the component at <=60% width; surroundings dim (dark) or wash to the ground (light) + vignette.
import json, subprocess, sys, math
from PIL import Image, ImageDraw, ImageFilter
cap, out = sys.argv[1], sys.argv[2]
m = json.load(open(f"{cap}/meta.json")); slow = m["slow"]; LIGHT = m.get("light"); COMP = m.get("comp")
fr = sorted(m["frames"], key=lambda f: f["t"])
lines = []
for i, f in enumerate(fr):
    d = (fr[i + 1]["t"] - f["t"]) / slow if i + 1 < len(fr) else max(1 / 60, (m["tEnd"] - f["t"]) / slow)
    lines.append(f"file 'frames/{f['name']}'\nduration {max(d, 0.0005):.6f}")
lines.append(f"file 'frames/{fr[-1]['name']}'")
open(f"{cap}/list.txt", "w").write("\n".join(lines))
first = Image.open(f"{cap}/frames/{fr[0]['name']}"); CW, CH = first.size
def smooth(t): t = min(1, max(0, t)); return t * t * (3 - 2 * t)
def vignette(W, H, strength, inner=0.5, span=0.85):
    v = Image.new("L", (W, H)); vp = v.load()
    for y in range(H):
        for x in range(W):
            r = math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2))
            vp[x, y] = int(255 * strength * smooth((r - inner) / span))
    return v
vig_rgb = (29, 27, 25) if LIGHT else (0, 0, 0)
if COMP:
    W, H = m["size"]
    # the vignette is drawn in-page on the ground only; nothing goes over the UI here
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(f"{cap}/mask.png")
    vf = f"[0:v]scale={W}:{H}:flags=lanczos,fps=60[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p"
else:
    W, H, MAXW, MAXH = 1024, 768, 0.60, 0.84
    c = m["crop"]; bx, by, bw, bh = c["x"], c["y"], c["w"], c["h"]
    z = min(MAXW * W / bw, MAXH * H / bh); cw, ch = W / z, H / z
    cx, cy = bx + bw / 2 - cw / 2, by + bh / 2 - ch / 2
    rw, rh = bw * z, bh * z; x0, y0 = (W - rw) / 2, (H - rh) / 2
    dim = Image.new("L", (W, H), int(255 * (0.55 if LIGHT else 0.46)))
    ImageDraw.Draw(dim).rounded_rectangle([x0, y0, x0 + rw, y0 + rh], radius=int(min(28, rh / 3)), fill=0)
    dim = dim.filter(ImageFilter.GaussianBlur(22))
    vig = vignette(W, H, 0.05 if LIGHT else 0.62, inner=0.6, span=0.7)
    # light: wash toward the warm ground, then a soft ink vignette; dark: one black layer
    if LIGHT:
        wash = Image.new("RGBA", (W, H), (248, 246, 243, 0)); wash.putalpha(dim)
        ink = Image.new("RGBA", (W, H), vig_rgb + (0,)); ink.putalpha(vig)
        mask = Image.alpha_composite(wash, ink)
    else:
        al = Image.new("L", (W, H)); ap, dp, vp = al.load(), dim.load(), vig.load()
        for y in range(H):
            for x in range(W):
                ap[x, y] = int(255 * (1 - (1 - dp[x, y] / 255) * (1 - vp[x, y] / 255)))
        mask = Image.new("RGBA", (W, H), (0, 0, 0, 0)); mask.putalpha(al)
    mask.save(f"{cap}/mask.png")
    L = max(0, math.ceil(-cx)); T = max(0, math.ceil(-cy)); R = max(0, math.ceil(cx + cw - CW)); B = max(0, math.ceil(cy + ch - CH))
    padc = "#F6F3F0" if LIGHT else "black"
    pre = f"pad={CW + L + R}:{CH + T + B}:{L}:{T}:{padc}," if (L or T or R or B) else ""
    vf = f"[0:v]{pre}crop={int(cw)}:{int(ch)}:{int(cx + L)}:{int(cy + T)},scale={W}:{H}:flags=lanczos,fps=60[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{cap}/list.txt", "-i", f"{cap}/mask.png",
                "-filter_complex", vf, "-r", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-movflags", "+faststart", out], check=True)
print(out.split("/")[-1])
