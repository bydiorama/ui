# usage: python3 -I seam.py <mp4>  -> mean abs diff (0-255) between first and last frame, plus probe
import subprocess, sys, json, tempfile, os
from PIL import Image, ImageChops, ImageStat
v = sys.argv[1]
T = tempfile.mkdtemp(); F, L = os.path.join(T, 'first.png'), os.path.join(T, 'last.png')
info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,r_frame_rate,nb_frames", "-show_entries", "format=duration", "-of", "json", v], capture_output=True, text=True).stdout)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", v, "-vf", "select=eq(n\\,0)", "-frames:v", "1", F], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-sseof", "-0.05", "-i", v, "-frames:v", "1", L], check=True)
a, b = Image.open(F).convert("RGB"), Image.open(L).convert("RGB")
d = ImageStat.Stat(ImageChops.difference(a, b)).mean
s = info["streams"][0]
print(f"{v.split('/')[-1]}: {s['width']}x{s['height']} {s['r_frame_rate']} frames={s['nb_frames']} dur={float(info['format']['duration']):.2f}s seam_diff={sum(d)/3:.3f}")
