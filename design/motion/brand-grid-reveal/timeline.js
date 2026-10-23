/* Per-element construction film. All timing is in seconds; all positions are
 * measured once from the approved DOM at 1×. No noise, rain, blur or screen scan. */
const stage = document.querySelector('#stage');
const app = document.querySelector('#design>div>div');
app.id = 'app';
const DURATION = 9.5;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp(x); return x*x*(3-2*x); };
const phase = (t, start, duration) => ease((t-start)/duration);
const NS = 'http://www.w3.org/2000/svg';
const atoms = [], groups = new Map(), photoSources = new Map(), photos = [];
// Transitions.dev: skeleton reveal 400ms; digit pop 500ms/8px/70ms/2px;
// stacked-item motion 320ms/1.05; chart morph 400ms. Sampled exactly for export.
const MOTION={skeleton:.4,digit:.5,digitStep:.07,digitDistance:8,digitBlur:2,photo:.25,photoScale:1.02,chart:.4};
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
  if(node.parentElement){const pr=node.parentElement.getBoundingClientRect();if(Math.abs(pr.x-r.x)<2&&Math.abs(pr.y-r.y)<2&&Math.abs(pr.width-r.width)<3&&Math.abs(pr.height-r.height)<3){radius=Math.max(radius,parseFloat(getComputedStyle(node.parentElement).borderTopLeftRadius)||0);target.style.borderRadius=radius+'px';cornerRadii.fill(radius);}}
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
  const introBase={shell:.04,header:.16,sidebar:.28,heading:.38,search:.64,brand:1.02,library:1.16,metric0:1.7,metric1:1.82,metric2:1.94}[key];
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
 ready=true;fit();
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
  const q=active?tween(t,cue+(i>=next.length-2?MOTION.digitStep*(i-next.length+3):0),MOTION.digit,digitEase):1;
  span.style.transform=`translateY(${MOTION.digitDistance*(1-q)}px)`;
  span.style.opacity=String(clamp(q));span.style.filter=`blur(${MOTION.digitBlur*Math.max(0,1-q)}px)`;
 });
}
function animateMetrics(t){
 const views=atoms.find(a=>a.originalText==='1.2k'),storage=atoms.find(a=>a.originalText==='70%'),members=atoms.find(a=>a.originalText==='14');
 digitUpdate(views,'1.3k',t,4.1);digitUpdate(storage,'72%',t,4.55);digitUpdate(members,'15',t,5.25);
 const v=tween(t,4.1,MOTION.chart),s=tween(t,4.55,MOTION.chart);
 const spark=atoms.find(a=>a.key==='metric0'&&a.isSVG).target;
 const line=`M2 32 C 12 ${31-v}, 16 ${26-2*v}, 26 ${27-2*v} S 40 ${20-3*v}, 50 ${21-3*v} S 64 ${12-4*v}, 72 ${11-4*v} S 80 ${6-4*v}, 84 ${6-4*v}`;
 const paths=spark.querySelectorAll('path');paths[0].setAttribute('d',line+' L 84 40 L 2 40 Z');paths[1].setAttribute('d',line);
 spark.querySelectorAll('circle').forEach(c=>c.setAttribute('cy',6-4*v));
 const share=.7+.02*s,ring=atoms.find(a=>a.key==='metric1'&&a.isSVG).target;
 ring.dataset.value=String(share);
 ring.children[0].setAttribute('d',ringPath(18,18,16,12,0,share*Math.PI*2,1,.5));
 ring.children[1].setAttribute('d',ringPath(18,18,16,12,share*Math.PI*2,Math.PI*2,1,.5));
 atoms.find(a=>a.originalText==='70 of 100 GB used').target.textContent=(t>=4.55?'72':'70')+' of 100 GB used';
}
function seek(t){
 current=Math.max(0,Math.min(DURATION,t));
 const time=reducedMotion.matches?-1:current;
 const buildTime=reducedMotion.matches?10:current;
 for(const a of atoms){
  const exit=6.6+(8-a.cue)*.16;
  const b=a.introCue;
  const q=tween(buildTime,b,.32),paint=a.isText?tween(buildTime,b+.46,.2,inOut):tween(buildTime,b+.32,.25);
  const rounding=tween(buildTime,b+.18,.39,inOut);
  a.target.style.borderRadius=a.cornerRadii.map(r=>`${r*rounding}px`).join(' ');
  a.outline.setAttribute('rx',a.isText?4*rounding:a.radius*rounding);
  const depart=phase(time,exit,.42);
  a.target.style.opacity=String(paint*(1-depart));
  // A local reveal; it never clips a sibling or sweeps the whole screen.
  a.target.style.clipPath=a.isSVG&&paint<1?`inset(0 ${(1-paint)*100}% 0 0)`:'none';
  const draw=q*(1-phase(time,exit+.3,.42));
  a.outline.style.strokeDashoffset=a.isText?'0':String(a.length*(1-draw));
  a.anchor.style.opacity=String((a.isText?0:.5)*pulse(buildTime,b,b+.04,b+.32,b+.48));
  a.link.style.strokeDashoffset=String(a.linkLength*(1-tween(buildTime,b,.1)));
  a.link.style.opacity=String((a.isText?0:.32)*pulse(buildTime,b,b+.04,b+.24,b+.4));
  a.outline.style.opacity=a.isText?String(phase(buildTime,b,.1)*(1-tween(buildTime,b+.32,.12,inOut))*(1-depart)):String(.4*(phase(buildTime,b,.04)*(1-phase(buildTime,b+.48,.18))+pulse(time,exit,exit+.2,exit+.48,exit+.76)));
 }
 const focus=pulse(time,2.85,3,3.3,3.45);
 document.querySelector('#search-feedback').style.opacity=focus;
 // Each original image and its frame share a pivot; the tile stays still.
 for(const p of photos){
  const q=tween(time,3.1+p.index*.04,.42,inOut);
  const lift=p.index===2&&q>0&&q<.999999?-3*Math.sin(Math.PI*q):0;
  p.wrap.style.transform=`translate(${p.dx*q}px,${p.dy*q+lift}px) rotate(${p.dr*q}deg)`;
 }
 const shell=atoms.find(a=>a.key==='shell');
 const frame=document.querySelector('#app-frame-edge');frame.style.borderRadius=shell.target.style.borderRadius;frame.style.opacity=shell.target.style.opacity;
 for(const [key,g]of groups)if(key!=='shell')g.el.style.clipPath=`inset(208px 160px 208px 160px round ${parseFloat(shell.target.style.borderTopLeftRadius)}px)`;
 animateMetrics(time);
 for(const a of atoms){const x=parseFloat(a.target.style.left),y=parseFloat(a.target.style.top);if(a.key==='metric2'&&x>=1155&&y<865)a.target.style.transform='scale('+(1-.025*pulse(time,5,5.08,5.16,5.32))+')';}
 // Dots never change phase, radius, or brightness; opaque surfaces simply occlude them.
 document.querySelector('#ground').style.opacity='.35';
 document.querySelector('#scrub').value=current;
 document.querySelector('#time').textContent=current.toFixed(1)+' / 9.5s';
 return {time:current,parts:atoms.length,components:groups.size};
}
window.filmAudit=()=>({parts:atoms.length,components:groups.size,visible:atoms.filter(a=>+a.target.style.opacity>.99).length,wireVisible:atoms.filter(a=>+a.outline.style.opacity>.001).length,gridLayers:document.querySelectorAll('#ground').length,globalEffects:document.querySelectorAll('.t-gen,.t-gen-dot').length,photoGroups:photos.length,sidebarRadius:atoms.find(a=>a.key==='sidebar'&&parseFloat(a.target.style.width)===240).target.style.borderRadius,skeletons:atoms.filter(a=>a.isText).length,values:atoms.filter(a=>['1.2k','70%','14','70 of 100 GB used'].includes(a.originalText)).map(a=>a.target.textContent)});
window.revealAudit=()=>({
 textOverlap:atoms.filter(a=>a.isText&&+a.target.style.opacity>.001&&+a.outline.style.opacity>.001).length,
 corners:atoms.filter(a=>a.cornerRadii.some(r=>r>0)).map(a=>({cue:a.introCue,current:parseFloat(a.target.style.borderTopLeftRadius),final:a.cornerRadii[0]})),
 photos:photos.map(p=>({actual:p.wrap.firstElementChild.getBoundingClientRect().toJSON(),destination:p.destination})),
 shell:{border:shellStyle().borderTop,shadow:shellStyle().boxShadow},
});
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
