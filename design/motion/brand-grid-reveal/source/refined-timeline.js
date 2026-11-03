/* Refined film: the UI is released by generated code, block by block. The cue sheet V
 * is prepended by scripts/build-refined.py. Per-element construction film. All timing is in seconds; all positions are
 * measured once from the approved DOM at 1×. No noise, rain, blur or screen scan. */
const stage = document.querySelector('#stage');
const app = document.querySelector('#design>div>div');
app.id = 'app';
const DURATION = V.duration;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp(x); return x*x*(3-2*x); };
const phase = (t, start, duration) => ease((t-start)/duration);
const NS = 'http://www.w3.org/2000/svg';
const cardClips=[];
const atoms = [], groups = new Map(), photoSources = new Map(), photos = [];
// Transitions.dev: skeleton reveal 400ms; digit pop 500ms/8px/70ms/2px;
// stacked-item motion 320ms/1.05; chart morph 400ms. Sampled exactly for export.
const MOTION={skeleton:.4,digit:.34,digitStep:.035,digitDistance:4,digitBlur:0,photo:.25,photoScale:1.02,chart:.4};
function bezier(x1,y1,x2,y2){return x=>{if(x<=0)return 0;if(x>=1)return 1;let lo=0,hi=1,u=x;for(let i=0;i<24;i++){u=(lo+hi)/2;const q=3*u*(1-u)*(1-u)*x1+3*u*u*(1-u)*x2+u*u*u;if(q<x)lo=u;else hi=u;}return 3*u*(1-u)*(1-u)*y1+3*u*u*(1-u)*y2+u*u*u;};}
const smoothOut=bezier(.22,1,.36,1), inOut=bezier(.42,0,.58,1), digitEase=bezier(.34,1.45,.64,1), tooltipEase=bezier(0,0,.58,1);
const tween=(t,start,duration,curve=smoothOut)=>curve(clamp((t-start)/duration));
let current = 0, playing = true, last = 0, ready = false;
const layer = document.createElement('div');
layer.id = 'procedural-ui';
Object.assign(layer.style, {position:'absolute', inset:'0', pointerEvents:'none'});
stage.append(layer);
const wires = document.querySelector('#connections');
stage.append(wires);
function fit() {
 const k = Math.min(innerWidth/1600,innerHeight/1200);
 stage.style.transform = `scale(${k})`;
 stage.style.left = `${(innerWidth-1600*k)/2}px`;
 stage.style.top = `${(innerHeight-1200*k)/2}px`;
}
function groupFor(r) {
 if(r.width>1200 && r.height>700) return ['shell', .6, 0];
 if(r.y<256) return ['header', 1.3, Math.floor((r.x-160)/160)*.035];
 if(r.x<420) return ['sidebar', 2.1, Math.floor((r.y-264)/35)*.065];
 if(r.y<410) return ['heading', 3.5, 0];
 if(r.y<495) return ['search', 4.1, 0];
 if(r.y<795) return [r.x<925?'brand':'library', r.x<925?4.9:5.7, 0];
 const col=Math.min(2,Math.max(0,Math.floor((r.x-616)/208)));
 return ['metric'+col, 6.7+col*.5, 0];
}
function construct() {
 stage.style.transform='none';stage.style.left='0';stage.style.top='0';
 const sidebar=[...app.querySelectorAll('div')].find(n=>n.style.width==='240px');sidebar.style.borderRadius='8px';
 const cardSources=[...app.querySelectorAll('div')].filter(n=>n.style.width==='100%'&&n.style.borderRadius==='16px');
 for(const card of cardSources){card.style.overflow='hidden';if(card.firstElementChild?.style.height==='200px')card.firstElementChild.style.borderRadius='15px 15px 0px 0px';}
 const nodes=[app,...app.querySelectorAll('div,svg')];
 for(const node of nodes) {
  if(node.closest('svg') && node.tagName.toLowerCase()!=='svg') continue;
  const cs=getComputedStyle(node), r=node.getBoundingClientRect();
  if(!r.width||!r.height)continue;
  const isSVG=node.tagName.toLowerCase()==='svg';
  const isText=!node.children.length && node.textContent.trim().length>0;
  const paint=cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.backgroundImage!=='none'||(parseFloat(cs.borderTopWidth)>0&&cs.borderTopStyle!=='none');
  if(!isSVG&&!isText&&!paint)continue;
  const [key,start,stagger]=groupFor(r);
  if(!groups.has(key)){
   const el=document.createElement('div');el.dataset.component=key;
   Object.assign(el.style,{position:'absolute',inset:'0'});layer.append(el);
   groups.set(key,{el,start});
  }
  const target=isSVG?node.cloneNode(true):document.createElement('div');
  if(isText)target.textContent=node.textContent.trim();
  const props=['boxSizing','backgroundColor','backgroundImage','backgroundSize','backgroundPosition','borderTop','borderRight','borderBottom','borderLeft','borderRadius','boxShadow','overflow','fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','color','textAlign','whiteSpace','fontSynthesis'];
  for(const p of props)target.style[p]=cs[p];
  let rotation=0;
  for(let n=node;n&&n!==stage;n=n.parentElement){const rot=parseFloat(getComputedStyle(n).rotate);if(Number.isFinite(rot))rotation+=rot;}
  const w=parseFloat(cs.width)||r.width,h=parseFloat(cs.height)||r.height;
  Object.assign(target.style,{position:'absolute',left:`${r.x+r.width/2-w/2}px`,top:`${r.y+r.height/2-h/2}px`,width:`${w}px`,height:`${h}px`,margin:'0',transformOrigin:'50% 50%',rotate:`${rotation}deg`});
  groups.get(key).el.append(target);
  if(key==='shell'){target.style.border='1px solid #ECE7E3';target.style.boxShadow='0 2px 8px #0000000A';}
  const cornerRadii=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k=>Math.min(parseFloat(cs[k])||0,w/2,h/2));
  const outline=document.createElementNS(NS,'rect');
  let radius=Math.min(parseFloat(cs.borderTopLeftRadius)||0,w/2,h/2);
  if(node.parentElement){const pr=node.parentElement.getBoundingClientRect();if(Math.abs(pr.x-r.x)<2&&Math.abs(pr.y-r.y)<2&&Math.abs(pr.width-r.width)<3&&Math.abs(pr.height-r.height)<3){radius=Math.max(radius,parseFloat(getComputedStyle(node.parentElement).borderTopLeftRadius)||0);const ps=getComputedStyle(node.parentElement);if(parseFloat(ps.borderTopLeftRadius)>0)['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].forEach((k,i)=>cornerRadii[i]=Math.min(parseFloat(ps[k])||0,w/2,h/2));target.style.borderRadius=cornerRadii.map(r=>r+'px').join(' ');}}
  const x=r.x+r.width/2-w/2,y=r.y+r.height/2-h/2;
  // Text uses an in-place skeleton slot; surfaces trace their actual rounded edge.
  const oh=isText?Math.max(6,Math.min(20,parseFloat(cs.fontSize)*.6)):h, oy=isText?y+(h-oh)/2:y;
  for(const [k,v]of Object.entries({x,y:oy,width:w,height:Math.max(oh,.5),rx:isText?0:radius,fill:'none',stroke:'var(--construction)','stroke-width':isText?1.1:.85,transform:`rotate(${rotation} ${r.x+r.width/2} ${r.y+r.height/2})`}))outline.setAttribute(k,v);
  if(isText){const range=document.createRange();range.selectNodeContents(node);outline.setAttribute('width',Math.min(w,range.getBoundingClientRect().width));outline.setAttribute('rx',Math.min(4,oh/2));outline.setAttribute('fill','var(--skeleton-fill)');outline.setAttribute('stroke','none');}
  wires.append(outline);
  const length=outline.getTotalLength();outline.style.strokeDasharray=isText?'none':length;
  const detail=isText?.32:isSVG?.26:(w<150||h<50)?.16:0;
  // Local sequence: 420ms trace, 260ms paint, 180ms trace retirement.
  const cue=start+stagger+detail+(key==='brand'||key==='library'?(y>700?.4:0):0);
  const anchor=document.createElementNS(NS,'circle');anchor.setAttribute('cx',x+(isText?0:radius));anchor.setAttribute('cy',oy);anchor.setAttribute('r','1.5');anchor.setAttribute('fill','var(--construction)');wires.append(anchor);
  const ux=x+(isText?0:radius),uy=oy,cx=r.x+r.width/2,cy=r.y+r.height/2,angle=rotation*Math.PI/180;
  const ax=cx+(ux-cx)*Math.cos(angle)-(uy-cy)*Math.sin(angle),ay=cy+(ux-cx)*Math.sin(angle)+(uy-cy)*Math.cos(angle);
  anchor.setAttribute('cx',ax);anchor.setAttribute('cy',ay);
  const gx=8+Math.round((ax-8)/16)*16,gy=8+Math.round((ay-8)/16)*16;
  const link=document.createElementNS(NS,'path');
  link.setAttribute('d',`M${gx} ${gy}H${ax}V${ay}`);link.setAttribute('fill','none');link.setAttribute('stroke','var(--construction)');link.setAttribute('stroke-width','.7');wires.append(link);
  const linkLength=link.getTotalLength();link.style.strokeDasharray=linkLength;
  let photo=null;
  for(let n=node;n&&n!==app;n=n.parentElement){if(key==='library'&&['120px','136px'].includes(n.style.width)&&n.style.padding==='4px'){photo=n;break;}}
  if(photo&&!photoSources.has(photo)){const pr=photo.getBoundingClientRect();photoSources.set(photo,{index:photoSources.size,cx:pr.x+pr.width/2,cy:pr.y+pr.height/2});}
  const introBase=revealAt(key);
  const introCue=introBase+Math.min(stagger*.45,.24)+(isText?.12:isSVG?.08:0)+((key==='brand'||key==='library')&&y>700?.16:0);
  const atom={target,outline,anchor,link,linkLength,length,cue,introCue,key,isText,isSVG,photo,radius,cornerRadii,originalText:isText?target.textContent:''};
  if(isText&&['1.2k','70%','14'].includes(atom.originalText)){target.classList.add('t-digit-group');Object.assign(target.style,{overflow:'visible',display:'inline-flex',whiteSpace:'nowrap',flexWrap:'nowrap',width:'max-content'});target.style.fontVariantNumeric='tabular-nums';target.replaceChildren(...[...atom.originalText].map(ch=>{const span=document.createElement('span');span.className='t-digit';span.textContent=ch;span.style.display='inline-block';return span;}));}
  atoms.push(atom);
 }
 for(const [source,info]of photoSources){
  const saved=source.style.cssText;
  const destination=[{left:'37px',top:'58px',rotate:'-8deg'},{left:'147px',top:'36px',rotate:'7deg'},{left:'83px',top:'58px',rotate:'0deg'}][info.index];
  const oldRotation=parseFloat(getComputedStyle(source).rotate)||0;
  Object.assign(source.style,destination,{translate:'none',transformOrigin:'0% 0%'});
  const dest=source.getBoundingClientRect();
  info.dx=dest.x+dest.width/2-info.cx;info.dy=dest.y+dest.height/2-info.cy;info.dr=parseFloat(destination.rotate)-oldRotation;
  info.destination={x:dest.x,y:dest.y,width:dest.width,height:dest.height};source.style.cssText=saved;
  const wrap=document.createElement('div');wrap.className='t-avatar';wrap.dataset.photo=info.index;Object.assign(wrap.style,{position:'absolute',inset:'0',transformOrigin:`${info.cx}px ${info.cy}px`,transition:'none'});groups.get('library').el.append(wrap);for(const a of atoms.filter(a=>a.photo===source))wrap.append(a.target);photos.push({...info,wrap});}
 for(const key of ['brand','library']){
  const outer=atoms.find(a=>a.key===key&&parseFloat(a.target.style.width)===304);
  const content=document.createElement('div');content.dataset.cardClip=key;Object.assign(content.style,{position:'absolute',inset:'0'});
  const group=groups.get(key).el;for(const child of [...group.children])if(child!==outer.target)content.append(child);group.append(content);
  cardClips.push({outer,content,x:parseFloat(outer.target.style.left)+1,y:parseFloat(outer.target.style.top)+1});
 }
 const donut=atoms.find(a=>a.key==='metric1'&&a.isSVG);donut.target.replaceChildren();
 for(const color of ['#5799B1','#EDE8E3']){const path=document.createElementNS(NS,'path');path.setAttribute('fill',color);path.setAttribute('stroke',color);path.setAttribute('stroke-width','1');path.setAttribute('stroke-linejoin','round');donut.target.append(path);}
 app.style.visibility='hidden';
 // One stationary lattice, shared phase across the entire composition.
 document.querySelector('#ground').style.backgroundSize='16px 16px';
 document.querySelector('#ground').style.backgroundPosition='0px 0px';
 // Gentle feedback entirely inside the UI, after construction is complete.
 const ring=document.createElement('div');ring.id='search-feedback';
 Object.assign(ring.style,{position:'absolute',left:'616px',top:'416px',width:'616px',height:'56px',border:'1.5px solid #5799B1',borderRadius:'999px',opacity:'0'});layer.append(ring);
 const frame=document.createElement('div');frame.id='app-frame-edge';Object.assign(frame.style,{position:'absolute',left:'160px',top:'208px',width:'1280px',height:'784px',boxSizing:'border-box',border:'1px solid #ECE7E3',pointerEvents:'none'});layer.append(frame);
 createCodeWidget();
 ready=true;fit();
}
// Generated-code widget. Four verbatim excerpts from this repository are typed
// in one block at a time; a block's commit is the moment it releases the region
// of the UI it describes (V.blocks[i].releases). Nothing in the UI starts before
// its block has fully landed, and the film's pacing is read from the cue sheet V.
const ROW = 22, CHAR_STEP = .002, GLYPH = .12;
const blocks = V.blocks.map((b, i) => {
 const start = V.typeStart[i];
 const lastLen = b.lines[b.lines.length - 1].length;
 const commit = start + (b.lines.length - 1) * V.lineStagger + lastLen * CHAR_STEP + GLYPH;
 return {...b, start, commit, row: V.blocks.slice(0, i).reduce((n, x) => n + x.lines.length, 0)};
});
const totalRows = blocks.reduce((n, b) => n + b.lines.length, 0);
const rowTiming = blocks.flatMap(b => b.lines.map((text, r) => ({start: b.start + r * V.lineStagger, text, block: b})));
// Region -> [releasing block, offset]. A region never starts before its block has landed.
const RELEASE={shell:[0,0],header:[1,.12],heading:[1,0],sidebar:[1,.1],search:[1,.28],brand:[2,0],library:[2,.16],metric0:[3,0],metric1:[3,.08],metric2:[3,.16]};
const revealAt=key=>blocks[RELEASE[key][0]].commit+RELEASE[key][1];
function createCodeWidget(){
 const vp = V.viewport;
 const widget = document.createElement('section');widget.id = 'code-widget';widget.setAttribute('aria-label', 'Generated source excerpts');
 Object.assign(widget.style, {position:'absolute', right:`${V.widget.right}px`, top:'32px', width:'448px', height:`${V.widget.height}px`, boxSizing:'border-box', background:'#FDFCFB', border:'1px solid #DAD4CE', borderRadius:'16px', boxShadow:'0 8px 32px #1D1B1914, 0 2px 4px #1D1B190A', overflow:'hidden', fontFamily:'Paper Mono', fontSize:'11px', lineHeight:'22px', color:'#69635D', zIndex:'4', pointerEvents:'none'});
 widget.innerHTML = '<div style="height:40px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:#F6F3F0;border-bottom:1px solid #EDE8E3;font-size:11px"><span id="code-file" style="color:#1D1B19"></span><span id="code-status" style="font-size:11px"></span></div><div id="code-viewport" style="height:' + vp.height + 'px;overflow:hidden;position:relative;background:#EDE8E4"><div id="code-lines" style="position:absolute;left:0;right:0;top:0;padding:0 20px"></div><div class="code-fader" style="position:absolute;inset:0 0 auto;height:' + vp.top + 'px;background:linear-gradient(in oklab 180deg,#EDE5E2,#FDFCFB00)"></div><div class="code-fader" style="position:absolute;inset:auto 0 0;height:' + vp.bottom + 'px;background:linear-gradient(in oklab 180deg,#FDFCFB00,#EDE5E2)"></div></div><div style="height:40px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #EDE8E3;background:#F6F3F0;font-size:11px"><span id="generation-status">Generating...</span><span id="code-count">0 lines</span></div>';
 const rows = widget.querySelector('#code-lines');rows.style.letterSpacing = 'normal';
 for (const b of blocks) {
  const band = document.createElement('div');band.className = 'code-band';
  Object.assign(band.style, {position:'absolute', left:'8px', right:'8px', top:`${b.row * ROW}px`, height:`${b.lines.length * ROW}px`, borderRadius:'6px', background:'#E3DAD5', opacity:'0'});
  rows.append(band);
 }
 rowTiming.forEach((r, i) => {
  const row = document.createElement('div');row.className = 'code-row';
  Object.assign(row.style, {position:'absolute', left:'20px', right:'20px', top:`${i * ROW}px`, height:`${ROW}px`, whiteSpace:'pre', display:'flex'});
  const n = document.createElement('span');n.style.cssText = 'width:40px;flex-shrink:0;color:#969089';n.textContent = String(r.block.from + (i - r.block.row)).padStart(4, '0');
  const text = document.createElement('span');text.className = 'code-text';
  for (const ch of r.text) {const g = document.createElement('span');g.textContent = ch;g.style.opacity = '0';text.append(g);}
  row.append(n, text);rows.append(row);
 });
 stage.append(widget);
}
function animateCodeWidget(t){
 const widget = document.querySelector('#code-widget');
 const visible = reducedMotion.matches ? 0 : tween(t, V.widget.in, .25) * (1 - tween(t, V.widget.out, .4));
 widget.style.opacity = visible;widget.style.transform = `translateY(${8 * (1 - tween(t, V.widget.in, .35))}px)`;widget.style.borderRadius = 16 * tween(t, V.widget.in, .45, inOut) + 'px';
 // The active block starts at the top of the viewport; earlier blocks scroll out above it.
 let scroll = 0;
 for (let i = 1; i < blocks.length; i++) scroll += (blocks[i].row - blocks[i - 1].row) * ROW * tween(t, blocks[i].start - .08, .35, smoothOut);
 document.querySelector('#code-lines').style.transform = `translateY(${V.viewport.pad - scroll}px)`;
 let landed = 0, active = blocks[0];
 document.querySelectorAll('.code-row').forEach((row, i) => {
  const r = rowTiming[i], next = blocks[blocks.indexOf(r.block) + 1];
  const dim = tween(t, next ? next.start : V.generated, .3);
  row.style.color = '#1D1B19';row.style.opacity = String(1 - .55 * dim);row.firstChild.style.opacity = String(tween(t, r.start, GLYPH, smoothOut));
  [...row.lastChild.children].forEach((g, c) => {g.style.opacity = String(tween(t, r.start + c * CHAR_STEP, GLYPH, smoothOut));});
  if (t >= r.start + r.text.length * CHAR_STEP + GLYPH) landed++;
 });
 for (const b of blocks) if (t >= b.start) active = b;
 document.querySelectorAll('.code-band').forEach((band, i) => {const c = blocks[i].commit;band.style.opacity = String(pulse(t, c - .08, c + .08, c + .55, c + .95));});
 document.querySelector('#code-file').textContent = active.file;
 document.querySelector('#code-status').textContent = active.name;
 document.querySelector('#code-count').textContent = landed + ' lines';
 const done = t >= V.generated, status = document.querySelector('#generation-status');
 status.textContent = done ? 'Generated' : 'Generating...';
 status.style.backgroundImage = done ? 'none' : 'linear-gradient(110deg,#69635D 35%,#B7B0A9 48%,#69635D 61%)';status.style.backgroundSize = '220% 100%';status.style.backgroundPosition = `${100 - ((Math.max(0, t - V.widget.in) % 1.4) / 1.4) * 200}% 0`;status.style.backgroundClip = 'text';status.style.color = done ? '#69635D' : 'transparent';
}

function pulse(t,a,b,c,d){return phase(t,a,b-a)*(1-phase(t,c,d-c));}
// Ring-sector geometry from transitions.dev / 35-donut-chart.md, kept inline
// for this demo under licenses/transitions-dev.LICENSE.txt.
function ringPath(cx,cy,ro,ri,a0,a1,gap,cr){
 const Ro=ro-cr,Ri=ri+cr,h=gap/2+cr;
 if(Ro<=Ri)return '';
 const dO=Math.asin(Math.min(1,h/Ro)),dI=Math.asin(Math.min(1,h/Ri));
 const o0=a0+dO,o1=a1-dO,i0=a0+dI,i1=a1-dI;
 if(i1-i0<=0||o1-o0<=0)return '';
 const pt=(r,a)=>(cx+r*Math.sin(a)).toFixed(3)+' '+(cy-r*Math.cos(a)).toFixed(3);
 const lo=o1-o0>Math.PI?1:0,li=i1-i0>Math.PI?1:0;
 return 'M'+pt(Ro,o0)+'A'+Ro+' '+Ro+' 0 '+lo+' 1 '+pt(Ro,o1)+'L'+pt(Ri,i1)+'A'+Ri+' '+Ri+' 0 '+li+' 0 '+pt(Ri,i0)+'Z';
}
function digitUpdate(atom,next,t,cue){
 const before=atom.originalText;const changed=t>=cue;
 [...atom.target.children].forEach((span,i)=>{
  const active=before[i]!==next[i]&&changed;
  span.textContent=changed?next[i]:before[i];
  const q=active?tween(t,cue+(i>=next.length-2?MOTION.digitStep*(i-next.length+3):0),MOTION.digit,smoothOut):1;
  span.style.transform=`translateY(${MOTION.digitDistance*(1-q)}px)`;
  span.style.opacity=String(clamp(q));span.style.filter=`blur(${MOTION.digitBlur*Math.max(0,1-q)}px)`;
 });
}
function animateMetrics(t){
 const views=atoms.find(a=>a.originalText==='1.2k'),storage=atoms.find(a=>a.originalText==='70%'),members=atoms.find(a=>a.originalText==='14');
 const [tv,ts,tm]=V.ticks;digitUpdate(views,'1.3k',t,tv);digitUpdate(storage,'72%',t,ts);digitUpdate(members,'15',t,tm);
 const v=tween(t,tv,MOTION.chart),s=tween(t,ts,MOTION.chart);
 const spark=atoms.find(a=>a.key==='metric0'&&a.isSVG).target;
 const line=`M2 32 C 12 ${31-v}, 16 ${26-2*v}, 26 ${27-2*v} S 40 ${20-3*v}, 50 ${21-3*v} S 64 ${12-4*v}, 72 ${11-4*v} S 80 ${6-4*v}, 84 ${6-4*v}`;
 const paths=spark.querySelectorAll('path');paths[0].setAttribute('d',line+' L 84 40 L 2 40 Z');paths[1].setAttribute('d',line);
 spark.querySelectorAll('circle').forEach(c=>c.setAttribute('cy',6-4*v));
 const share=.7+.02*s,ring=atoms.find(a=>a.key==='metric1'&&a.isSVG).target;
 ring.dataset.value=String(share);
 ring.children[0].setAttribute('d',ringPath(18,18,16,12,0,share*Math.PI*2,1,.5));
 ring.children[1].setAttribute('d',ringPath(18,18,16,12,share*Math.PI*2,Math.PI*2,1,.5));
 atoms.find(a=>a.originalText==='70 of 100 GB used').target.textContent=(t>=ts?'72':'70')+' of 100 GB used';
}
function seek(t){
 current=Math.max(0,Math.min(DURATION,t));
 const time=reducedMotion.matches?-1:current;
 const buildTime=reducedMotion.matches?10:current;
 for(const a of atoms){
  const exit=V.retire.start+(8-a.cue)*V.retire.spread;
  const b=a.introCue;
  const q=tween(buildTime,b,.32),paint=a.isText?tween(buildTime,b+.46,.2,inOut):tween(buildTime,b+.32,.25);
  const rounding=tween(buildTime,b+.18,.39,inOut)*(1-phase(time,exit,.3));
  a.target.style.borderRadius=a.cornerRadii.map(r=>`${r*rounding}px`).join(' ');
  a.outline.setAttribute('rx',a.isText?4*rounding:a.radius*rounding);
  const depart=phase(time,exit,.3);
  a.target.style.opacity=String(paint*(1-depart));
  // A local reveal; it never clips a sibling or sweeps the whole screen.
  a.target.style.clipPath=a.isSVG&&paint<1?`inset(0 ${(1-paint)*100}% 0 0)`:'none';
  const draw=q*(1-phase(time,exit+.2,.28));
  a.outline.style.strokeDashoffset=a.isText?'0':String(a.length*(1-draw));
  a.anchor.style.opacity=String((a.isText?0:.5)*pulse(buildTime,b,b+.04,b+.32,b+.48));
  a.link.style.strokeDashoffset=String(a.linkLength*(1-tween(buildTime,b,.1)));
  a.link.style.opacity=String((a.isText?0:.32)*pulse(buildTime,b,b+.04,b+.24,b+.4));
  a.outline.style.opacity=a.isText?String(phase(buildTime,b,.1)*(1-tween(buildTime,b+.32,.12,inOut))*(1-depart)):String(.28*(phase(buildTime,b,.04)*(1-phase(buildTime,b+.48,.18))+pulse(time,exit,exit+.1,exit+.28,exit+.48)));
 }
 const focus=0;
 document.querySelector('#search-feedback').style.opacity=focus;
 // Each original image and its frame share a pivot; the tile stays still.
 for(const p of photos){
  const q=tween(time,V.photo+p.index*.055,.54,smoothOut);
  const lift=p.index===2&&q>0&&q<.999999?-3*Math.sin(Math.PI*q):0;
  p.wrap.style.transform=`translate(${p.dx*q}px,${p.dy*q+lift}px) rotate(${p.dr*q}deg)`;
 }
 const shell=atoms.find(a=>a.key==='shell');
 const frame=document.querySelector('#app-frame-edge');frame.style.borderRadius=shell.target.style.borderRadius;frame.style.opacity=shell.target.style.opacity;
 for(const [key,g]of groups)if(key!=='shell')g.el.style.clipPath=`inset(208px 160px 208px 160px round ${parseFloat(shell.target.style.borderTopLeftRadius)}px)`;
 for(const {outer,content,x,y}of cardClips){const radius=Math.max(0,parseFloat(outer.target.style.borderTopLeftRadius)-1);content.style.clipPath=`inset(${y}px ${1600-x-302}px ${1200-y-270}px ${x}px round ${radius}px)`;}
 animateCodeWidget(time);
 animateMetrics(time);
 // Dots never change phase, radius, or brightness; opaque surfaces simply occlude them.
 document.querySelector('#ground').style.opacity='.35';
 document.querySelector('#scrub').value=current;
 document.querySelector('#time').textContent=current.toFixed(1)+' / '+DURATION+'s';
 return {time:current,parts:atoms.length,components:groups.size};
}
window.filmAudit=()=>({parts:atoms.length,components:groups.size,visible:atoms.filter(a=>+a.target.style.opacity>.99).length,wireVisible:atoms.filter(a=>+a.outline.style.opacity>.001).length,gridLayers:document.querySelectorAll('#ground').length,globalEffects:document.querySelectorAll('.t-gen,.t-gen-dot').length,photoGroups:photos.length,sidebarRadius:atoms.find(a=>a.key==='sidebar'&&parseFloat(a.target.style.width)===240).target.style.borderRadius,skeletons:atoms.filter(a=>a.isText).length,values:atoms.filter(a=>['1.2k','70%','14','70 of 100 GB used'].includes(a.originalText)).map(a=>a.target.textContent)});
window.revealAudit=()=>({
 textOverlap:atoms.filter(a=>a.isText&&+a.target.style.opacity>.001&&+a.outline.style.opacity>.001).length,
 corners:atoms.filter(a=>a.cornerRadii.some(r=>r>0)).map(a=>({cue:a.introCue,current:parseFloat(a.target.style.borderTopLeftRadius),final:a.cornerRadii[0]})),
 photos:photos.map(p=>({actual:p.wrap.firstElementChild.getBoundingClientRect().toJSON(),destination:p.destination})),
 shell:{border:shellStyle().borderTop,shadow:shellStyle().boxShadow},
 widget:{opacity:+document.querySelector('#code-widget').style.opacity,lines:document.querySelector('#code-count').textContent,file:document.querySelector('#code-file').textContent,block:document.querySelector('#code-status').textContent,fontSize:getComputedStyle(document.querySelector('#code-widget')).fontSize,lineHeight:getComputedStyle(document.querySelector('.code-text')).lineHeight,status:document.querySelector('#generation-status').textContent},
 cardClips:cardClips.map(c=>({outer:parseFloat(c.outer.target.style.borderTopLeftRadius),clip:c.content.style.clipPath})),
});
// Cue sheet as built: block timing and the first UI cue each block releases.
window.cueSheet=()=>({duration:DURATION,blocks:blocks.map(b=>({name:b.name,file:b.file,start:b.start,commit:b.commit,rows:b.lines.length,releases:b.releases,
 firstCue:Math.min(...atoms.filter(a=>b.releases.includes(a.key)).map(a=>a.introCue))})),generated:V.generated,photo:V.photo,ticks:V.ticks,retire:V.retire});
// Geometry of the active block inside the viewport at time t, for legibility checks.
window.codeLegibility=(t,index)=>{seek(t);const vp=document.querySelector('#code-viewport').getBoundingClientRect(),k=vp.width/document.querySelector('#code-viewport').offsetWidth;const active=blocks[index];
 const rows=[...document.querySelectorAll('.code-row')].slice(active.row,active.row+active.lines.length).map(r=>{const q=r.getBoundingClientRect(),tx=r.lastChild.getBoundingClientRect();return{top:q.top-vp.top,bottom:q.bottom-vp.top,textRight:tx.right-vp.left,textWidth:r.lastChild.scrollWidth*k}});
 return{block:active.name,scale:k,viewport:{height:vp.height,width:vp.width,top:V.viewport.top*k,bottom:vp.height-V.viewport.bottom*k},rows}};
function shellStyle(){return getComputedStyle(atoms.find(a=>a.key==='shell').target)}
window.seek=seek;window.duration=DURATION;window.showIntroInstant=()=>seek(2.8);
window.runDemo=()=>new Promise(resolve=>{const start=performance.now();function tick(now){const t=(now-start)/1000/(window.__SLOW||1);seek(Math.min(t,DURATION));if(t<DURATION)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
window.runComposition=window.runDemo;window.runSnippet=window.runDemo;
window.snippetRect=()=>({x:160,y:208,w:1280,h:784});
window.ready=(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('[style]')].flatMap(el=>{const m=el.style.backgroundImage.match(/url\(["']?(data:[^"')]+)/);if(!m)return[];return[new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=m[1]})]}));construct();seek(0);if(window.__RENDER||location.hash==='#render')document.documentElement.classList.add('render');else requestAnimationFrame(loop);return true})();
function loop(now){if(last&&playing&&!reducedMotion.matches)seek((current+(now-last)/1000)%DURATION);last=now;requestAnimationFrame(loop)}
addEventListener('resize',()=>{if(ready)fit()});
function setPlaying(value){playing=value;const b=document.querySelector('#play');b.textContent=value?'Pause':'Play';b.setAttribute('aria-label',value?'Pause animation':'Play animation')}
document.querySelector('#play').onclick=()=>setPlaying(!playing);
document.querySelector('#scrub').max=DURATION;
document.querySelector('#scrub').oninput=e=>{setPlaying(false);seek(+e.target.value)};
reducedMotion.addEventListener('change',()=>seek(0));
