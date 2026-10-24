"""Review decoded export seams and create even-time and beat contact sheets."""
from pathlib import Path
import json, subprocess, tempfile, sys
from PIL import Image, ImageChops, ImageStat, ImageDraw

root = Path(__file__).resolve().parent.parent
reports = []
for mode, w, h, duration in [('directed',1600,1200,9.5), ('slow',1600,1200,16), ('portrait',1080,1350,9.5)]:
    if len(sys.argv)>1 and mode not in sys.argv[1:]:
        continue
    video = root / f'exports/videos/brand-grid-reveal-{mode}-light-{w}x{h}-60fps.mp4'
    probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    stream = probe['streams'][0]
    assert (stream['width'], stream['height'], stream['r_frame_rate'], int(stream['nb_frames'])) == (w,h,'60/1',int(duration*60))
    assert abs(float(probe['format']['duration'])-duration) < .01
    with tempfile.TemporaryDirectory() as scratch:
        def frame(t, name):
            path = Path(scratch) / (name+'.png')
            subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(path)],check=True)
            return Image.open(path).convert('RGB')
        first, last = frame(0,'first'), frame((duration*60-1)/60,'last')
        seam = sum(ImageStat.Stat(ImageChops.difference(first,last)).mean)/3
        assert seam < .5, (mode,seam)
        source_beats = [.5,1.2,2.5,3.15,3.5,5.7,7.65,8.9]
        beats = [t*3.6 if t<=2.5 else t+6.5 for t in source_beats] if mode=='slow' else source_beats
        for label, times in [('even',[duration*(i+.5)/8 for i in range(8)]),('beats',beats)]:
            tw = 450 if mode=='portrait' else 600
            th = round(tw*h/w)
            sheet = Image.new('RGB',(tw*4,(th+26)*2),'#e6e2de')
            draw = ImageDraw.Draw(sheet)
            for i,t in enumerate(times):
                x,y=(i%4)*tw,(i//4)*(th+26)
                shot=frame(t,f'{label}-{i}')
                sheet.paste(shot.resize((tw,th),Image.Resampling.LANCZOS),(x,y))
                draw.text((x+10,y+th+6),f'{mode} / {t:.2f}s',fill='#302d29')
            dest=root/f'exports/contact-sheets/{mode}-{label}.png'
            dest.parent.mkdir(parents=True,exist_ok=True)
            sheet.save(dest)
        for t in [beats[1],beats[4],beats[5]]:
            frame(t,f'decoded-{t}').save(root/f'exports/stills/{mode}/decoded-{t:.2f}.png')
        result={'version':mode,'width':w,'height':h,'duration':duration,'fps':60,'frames':int(duration*60),'seamMeanAbsoluteDifference':seam}
        reports.append(result)
        print(json.dumps(result),flush=True)
report_path=root/'exports/reports/export-review.json'
if report_path.exists() and len(sys.argv)>1:
    old=json.loads(report_path.read_text())
    modes={v['version'] for v in reports}
    reports=[v for v in old if v['version'] not in modes]+reports
report_path.write_text(json.dumps(reports,indent=2)+'\n')
