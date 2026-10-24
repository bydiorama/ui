from pathlib import Path
import json,subprocess,tempfile
from PIL import Image,ImageChops,ImageStat,ImageDraw
root=Path(__file__).resolve().parent.parent
video=root/'exports/videos/button-showcase-light-1600x1200-60fps.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
s=probe['streams'][0]
assert (s['width'],s['height'],s['r_frame_rate'],int(s['nb_frames']))==(1600,1200,'60/1',570)
with tempfile.TemporaryDirectory() as tmp:
 def frame(t):
  p=Path(tmp)/f'{t}.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(p)],check=True);return Image.open(p).convert('RGB')
 seam=sum(ImageStat.Stat(ImageChops.difference(frame(0),frame(569/60))).mean)/3
 assert seam<.5,seam
 for name,times in [('even',[9.5*(i+.5)/8 for i in range(8)]),('beats',[.4,1.15,1.8,2.3,3,4.8,6.2,8.2])]:
  sheet=Image.new('RGB',(2400,952),'#e6e2de');draw=ImageDraw.Draw(sheet)
  for i,t in enumerate(times):
   x=(i%4)*600;y=(i//4)*476;sheet.paste(frame(t).resize((600,450),Image.Resampling.LANCZOS),(x,y));draw.text((x+10,y+456),f'Button / {t:.2f}s',fill='#302d29')
  out=root/f'exports/contact-sheets/{name}.png';out.parent.mkdir(parents=True,exist_ok=True);sheet.save(out)
 for t in [2.3,4.8,6.2]:frame(t).save(root/f'exports/stills/qa/decoded-{t}.png')
report={'width':1600,'height':1200,'fps':60,'frames':570,'duration':9.5,'seamMeanAbsoluteDifference':seam}
(root/'exports/reports/export-review.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
