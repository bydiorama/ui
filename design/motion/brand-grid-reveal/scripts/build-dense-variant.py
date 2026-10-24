"""Build a separate, deterministic high-density code-stream film."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
repo=root.parents[2]
paths=['registry/ui/button/button.tsx','registry/ui/card/card.tsx','registry/ui/header/header.tsx','registry/lib/motion.ts','design/motion/brand-grid-reveal/source/timeline.js']
lines=[]
for name in paths:
 p=repo/name
 if not p.exists():continue
 lines.append('// '+name)
 for line in p.read_text().splitlines():
  if not line.strip() or len(line)>180:continue
  lines.append(line)
while len(lines)<2400:lines+=lines[:min(len(lines),2400-len(lines))]
lines=lines[:2400]
s=(root/'source/timeline.js').read_text()
a=s.index('const codeLines=');b=s.index('const codeSections=',a)
s=s[:a]+'const codeLines='+json.dumps(lines)+';\n'+s[b:]
a=s.index(" const rows=widget.querySelector('#code-lines');");b=s.index('\nfunction pulse(',a)
s=s[:a]+''' const rows=widget.querySelector('#code-lines');rows.style.cssText='padding:0 20px;font-size:11px;line-height:22px;letter-spacing:normal';
 for(let i=0;i<28;i++){const row=document.createElement('div');row.style.cssText='height:22px;white-space:pre;display:flex;opacity:.9';const n=document.createElement('span');n.style.cssText='width:28px;flex-shrink:0;color:#969089';const text=document.createElement('span');row.append(n,text);rows.append(row);}stage.append(widget);
}
function animateCodeWidget(t){
 const widget=document.querySelector('#code-widget');
 const visible=reducedMotion.matches?0:tween(t,.1,.25)*(1-tween(t,5.8,.35));
 widget.style.opacity=visible;widget.style.transform=`translateY(${8*(1-tween(t,.1,.35))}px)`;widget.style.borderRadius=16*tween(t,.1,.45,inOut)+'px';
 // Continuous 220 lines/sec: each line crosses the viewport in ~46ms.
 // Virtual rows avoid a huge DOM and keep all frames deterministic.
 const position=Math.max(0,t-.1)*220;
 const first=Math.floor(position),fraction=position-first;
 const rows=document.querySelector('#code-lines');rows.style.transform=`translateY(${-fraction*22}px)`;
 [...rows.children].forEach((row,i)=>{const index=first+i;row.children[0].textContent=String(index+1).padStart(4,'0');row.children[1].textContent=codeLines[index%codeLines.length];});
 document.querySelector('#code-count').textContent=(first+28).toLocaleString('en-US')+' lines';document.querySelector('#code-status').textContent='Building';
 const status=document.querySelector('#generation-status');status.textContent='Generating...';
 status.style.backgroundImage='linear-gradient(110deg,#69635D 35%,#B7B0A9 48%,#69635D 61%)';status.style.backgroundSize='220% 100%';status.style.backgroundPosition=`${100-((Math.max(0,t-.3)%1.4)/1.4)*200}% 0`;status.style.backgroundClip='text';status.style.color='transparent';
}
''' +s[b:]
html=(root/'previews/brand-grid-reveal.html').read_text();html=html[:html.rfind('<script>')]+'<script>\n'+s+'\n</script>\n</body></html>\n'
(root/'previews/brand-grid-reveal-dense.html').write_text(html)
r=(root/'scripts/render.mjs').read_text().replace("previews/brand-grid-reveal.html","previews/brand-grid-reveal-dense.html").replace('brand-grid-reveal-light-1600x1200-60fps.mp4','brand-grid-reveal-dense-code-light-1600x1200-60fps.mp4').replace('`beat-','`dense-beat-').replace("reports/render-report.json","reports/dense-render-report.json")
(root/'scripts/render-dense.mjs').write_text(r)
print(f'Built alternate preview: {len(lines)} source lines, 220 lines/sec')
