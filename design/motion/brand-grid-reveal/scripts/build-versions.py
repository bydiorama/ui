from pathlib import Path
r=Path(__file__).resolve().parent.parent
base=(r/'previews/brand-grid-reveal-directed.html').read_text()
timeline=(r/'source/directed-timeline.js').read_text()
def write(name,script,css=''):
 html=base[:base.index('<script>')]
 html=html.replace('</style>',css+'\n</style>',1)
 (r/'previews'/name).write_text(html+'<script>\n'+script+'\n</script></html>')
# Complete the 2.5s construction beat in nine seconds, retain later action pacing.
slow=timeline.replace('const DURATION = 9.5;','const DURATION = 16;')
cut=slow.rindex('function seek(t){')
head,tail=slow[:cut],slow[cut:]
tail=tail.replace('const time=reducedMotion.matches?-1:current;','const mapped=current<=9?current/3.6:current-6.5;\n const time=reducedMotion.matches?-1:mapped;')
tail=tail.replace('const buildTime=reducedMotion.matches?10:current;','const buildTime=reducedMotion.matches?10:mapped;').replace("' / 9.5s'","' / 16.0s'")
slow=head+tail
write('brand-grid-reveal-slow.html',slow)
# Paper Demo - Portrait: 960×1200, app (32,208,1144,784), widget (480,32,448,242).
# Keep construction coordinates in the existing 1600×1200 plane, crop at x=128.
a=timeline.index('function fit() {');b=timeline.index('\nfunction groupFor',a)
portrait=timeline[:a]+'''function fit(){
 const k=Math.min(innerWidth/960,innerHeight/1200);
 stage.style.transform=`scale(${k})`;
 stage.style.left=`${(innerWidth-960*k)/2-128*k}px`;
 stage.style.top=`${(innerHeight-1200*k)/2}px`;
}
'''+timeline[b:]
# Edit executable sections only: the code stream contains quoted copies of helpers.
a=portrait.index('const codeLines=');b=portrait.index('const codeSections=',a)
head,code,tail=portrait[:a],portrait[a:b],portrait[b:]
head=head.replace('r.width>1200','r.width>1100').replace('r.x<925','r.x<857').replace('(r.x-616)/208','(r.x-548)/208')
head=head.replace("width:'1280px',height:'784px'","width:'1144px',height:'784px'")
tail=tail.replace("right:'32px',top:'32px',width:'448px',height:'304px'","right:'544px',top:'32px',width:'448px',height:'242px'")
tail=tail.replace('height:222px;overflow:hidden','height:160px;overflow:hidden')
tail=tail.replace('inset(208px 160px 208px 160px round','inset(208px 296px 208px 160px round')
# Keep the single background lattice present for the entire loop.
portrait=head+code+tail
write('brand-grid-reveal-portrait.html',portrait,'''#app{left:160px!important;translate:0 -50%!important;width:1144px!important;border:1px solid #ECE7E3}
#stage{overflow:visible}#ground{inset:-1000px}''')
print('Built slower and Paper portrait previews')
