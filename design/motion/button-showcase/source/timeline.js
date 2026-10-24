// Adapted from the deterministic brand-grid reveal; UI geometry comes from Paper.
const stage=document.querySelector('#stage'),paper=stage.firstElementChild,sheet=paper.children[1],content=sheet.firstElementChild;
sheet.id='sheet';const sections=[...content.children];
const duration=9.5,reduce=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=x=>Math.max(0,Math.min(1,x));
function cubic(x1,y1,x2,y2){return x=>{x=clamp(x);if(x===0||x===1)return x;let lo=0,hi=1,u=x;for(let i=0;i<22;i++){u=(lo+hi)/2;const q=3*u*(1-u)**2*x1+3*u*u*(1-u)*x2+u**3;if(q<x)lo=u;else hi=u;}return 3*u*(1-u)**2*y1+3*u*u*(1-u)*y2+u**3;};}
const out=cubic(.22,1,.36,1),inOut=cubic(.42,0,.58,1),micro=cubic(0,0,.2,1);
const tween=(t,a,d,e=out)=>e((t-a)/d),pulse=(t,a,b,c,d)=>tween(t,a,b-a)*(1-tween(t,c,d-c));
let current=0,playing=true,last=0,ready=false,clicks=0,interactiveStart=null;
const reveals=[],controls=[];let hero,heroLabel,heroIcon,heroEnd,sizes=[],variants=[],cursor,drawings;
function fit(){const k=Math.min(innerWidth/1600,innerHeight/1200);stage.style.transform=`scale(${k})`;stage.style.left=(innerWidth-1600*k)/2+'px';stage.style.top=(innerHeight-1200*k)/2+'px';}
function replaceButton(div){const button=document.createElement('button');button.type='button';button.style.cssText=div.style.cssText;button.style.paddingBlock='0px';button.replaceChildren(...div.childNodes);div.replaceWith(button);button.dataset.slot='button';return button;}
function setup(){
 stage.style.transform='none';
 const heading=(section,title,copy)=>{section.firstElementChild.style.minHeight='86px';section.firstElementChild.firstElementChild.textContent=title;const text=section.firstElementChild.children[1];if(text)text.textContent=copy;};
 heading(sections[2],'Sizes','Three heights. One consistent 16px icon. Soft corners by default; full rounding when the shape calls for it.');
 heading(sections[3],'Variants and states','A fill with a matching edge, or an edge on nothing. Hover, press, focus and disabled each keep their own role.');
 heading(sections[4],'Busy and full width','Busy keeps focus and its tab stop while refusing repeat activation. Disabled removes the control from the tab order.');
 for(const d of [...sheet.querySelectorAll('div')])if(d.style.justifyContent==='center'&&['24px','32px','44px'].includes(d.style.height))controls.push(replaceButton(d));
 hero=sections[1].children[1].children[0];hero.id='hero-button';hero.style.width='164px';hero.style.flexShrink='0';
 heroIcon=document.createElement('span');heroIcon.style.cssText='display:flex;width:16px;height:16px;flex-shrink:0';heroIcon.innerHTML=ICONS.Plus;hero.firstElementChild.replaceWith(heroIcon);
 heroLabel=hero.children[1];heroEnd=hero.lastElementChild;heroEnd.outerHTML=ICONS.ChevronRight;
 hero.addEventListener('click',e=>{if(hero.getAttribute('aria-busy')==='true'){e.preventDefault();return;}clicks++;if(location.hash!=='#render'){interactiveStart=performance.now();playing=false;const run=now=>{const t=1.9+(now-interactiveStart)/1000;seek(Math.min(t,3.35));if(t<3.35)requestAnimationFrame(run)};requestAnimationFrame(run)}});
 const sizeRows=sections[2].children[1];sizes=[...sizeRows.querySelectorAll('button')];
 variants=[...sections[3].querySelectorAll('button')].slice(0,5);
 const disabledRow=sections[3].children[1].lastElementChild;
 const disabledButtons=[...disabledRow.querySelectorAll('button')];disabledButtons.forEach(b=>b.disabled=true);
 if(disabledButtons[3]){disabledButtons[3].style.background='transparent';disabledButtons[3].style.boxShadow='none';}
 disabledRow.firstElementChild.lastElementChild.textContent='Unavailable controls flatten. Ghost keeps its absence of chrome and takes only disabled ink.';
 controls.forEach(b=>{if(!b.textContent.trim())b.setAttribute('aria-label','Create new')});
 // Replace the sheet's simple illustrative plus/chevrons with the actual icon library glyphs.
 for(const button of controls){if(button===hero)continue;for(const svg of button.querySelectorAll('svg')){const d=svg.querySelector('path')?.getAttribute('d')||'';if(d.includes('M8 3.5'))svg.outerHTML=ICONS.Plus;else if(d.includes('M6 3.5'))svg.outerHTML=ICONS.ChevronRight;}button.addEventListener('click',e=>e.preventDefault());}
 drawings=document.createElementNS('http://www.w3.org/2000/svg','svg');drawings.id='drawings';drawings.setAttribute('width','1120');drawings.setAttribute('height',String(sheet.offsetHeight));
 sheet.append(drawings);
 const sr=sheet.getBoundingClientRect();
 for(const [si,section]of sections.entries()){
  for(const n of section.querySelectorAll('div,button,svg,span')){
   if(n.closest('svg')&&n.tagName.toLowerCase()!=='svg')continue;
   const isText=!n.children.length&&n.textContent.trim(),isButton=n.tagName==='BUTTON';
   if(!isText&&!isButton)continue;
   const rect=n.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   const cs=getComputedStyle(n),x=rect.x-sr.x,y=rect.y-sr.y;
   const outline=document.createElementNS(drawings.namespaceURI,'rect');
   const h=isText?Math.min(14,parseFloat(cs.fontSize)*.62):rect.height;
   Object.entries({x,y:y+(rect.height-h)/2,width:rect.width,height:h,rx:0,fill:isText?'#E7E2DC':'none',stroke:isText?'none':'#98918A','stroke-width':.85}).forEach(([k,v])=>outline.setAttribute(k,v));
   drawings.append(outline);const length=outline.getTotalLength();if(!isText)outline.style.strokeDasharray=length;
   const cue=.08+Math.min(si*.08,.32)+(isText?.06:0)+Math.min((y%180)/180*.07,.07);
   reveals.push({node:n,outline,length,isText,isButton,cue,radius:parseFloat(cs.borderTopLeftRadius)||0});
  }
 }
 sheet.append(drawings);
 cursor=document.createElement('div');cursor.id='cursor';cursor.innerHTML='<svg width="24" height="28" viewBox="0 0 24 28"><path d="M3 2 3 23 9 17 13 26 17 24 13 16 22 16Z" fill="#1D1B19" stroke="#FDFCFB" stroke-width="1.5" stroke-linejoin="round"/></svg>';stage.append(cursor);
 ready=true;fit();
}
function seek(t){
 current=clamp(t/duration)*duration;const time=reduce.matches?3.35:current;
 const vanish=reduce.matches?0:tween(time,8.45,.65,inOut);
 sheet.style.opacity=String(reduce.matches?1:tween(time,.04,.36)*(1-vanish));
 sheet.style.borderRadius=(reduce.matches?24:24*tween(time,.08,.42,inOut)*(1-vanish))+'px';
 const scroll=reduce.matches?0:(520*tween(time,3.4,.8,inOut)+130*tween(time,5.25,.4,inOut))*(1-tween(time,7.4,.8,inOut));
 sheet.style.transform=`translateY(${-scroll}px)`;
 for(const a of reveals){
  const textOut=tween(time,a.cue+.27,.14,inOut),paint=tween(time,a.cue+(a.isText?.42:.22),a.isText?.14:.24);
  a.node.style.opacity=String(reduce.matches?1:paint);
  if(a.isButton)a.node.style.borderRadius=(reduce.matches?a.radius:a.radius*tween(time,a.cue+.1,.4,inOut))+'px';
  a.outline.setAttribute('rx',a.isText?3:a.radius*tween(time,a.cue+.1,.4,inOut));
  a.outline.style.opacity=String(reduce.matches?0:a.isText?tween(time,a.cue,.08)*(1-textOut):.24*pulse(time,a.cue,a.cue+.08,a.cue+.26,a.cue+.5));
  if(!a.isText)a.outline.style.strokeDashoffset=String(a.length*(1-tween(time,a.cue,.3)));
 }
 const busy=time>=1.9&&time<2.7,done=time>=2.7&&time<7.4,pressed=time>=1.75&&time<1.9;
 hero.setAttribute('aria-busy',String(busy));hero.setAttribute('aria-disabled',String(busy));hero.dataset.phase=busy?'busy':done?'complete':pressed?'pressed':time>=1.5&&time<1.75?'hover':'rest';
 heroLabel.textContent=busy?'Creating…':done?'Created':'Create new';
 const iconState=busy?'busy':done?'done':'rest';if(heroIcon.dataset.state!==iconState){heroIcon.innerHTML=busy?'<span class="spinner"></span>':done?ICONS.Check:ICONS.Plus;heroIcon.dataset.state=iconState;}
 if(busy)heroIcon.firstElementChild.style.transform=`rotate(${(time-1.9)*360}deg)`;
 const hover=pulse(time,1.5,1.62,2.7,2.82);hero.style.backgroundColor=pressed?'var(--ui-bg-accent-active)':`color-mix(in srgb,var(--ui-bg-accent) ${(1-hover)*100}%,var(--ui-bg-accent-hover))`;hero.style.boxShadow='inset 0 0 0 1.5px '+(pressed?'var(--ui-bg-accent-active)':'var(--ui-bg-accent)');
 hero.style.transform=`scale(${pressed&&!reduce.matches?.96:1})`;
 hero.style.outline=time>=1.9&&time<3.35?'2px solid var(--ui-focus)':'none';hero.style.outlineOffset='2px';
 if(time>=1.9&&time<3.35)hero.focus({preventScroll:true});else if(document.activeElement===hero)hero.blur();
 for(const [i,b]of sizes.entries()){const p=pulse(time,4.25+i*.06,4.37+i*.06,4.65+i*.06,4.85+i*.06);b.style.backgroundColor=`color-mix(in srgb,var(--ui-bg-accent) ${(1-p)*100}%,var(--ui-bg-accent-hover))`;b.style.boxShadow='inset 0 0 0 1.5px '+b.style.backgroundColor;}
 for(const [i,b]of variants.entries()){const p=pulse(time,5.6+i*.12,5.72+i*.12,6.35+i*.12,6.55+i*.12);b.style.outline=`2px solid rgb(69 128 150 / ${p})`;b.style.outlineOffset='2px';}
 const move=tween(time,1.2,.3,inOut),cx=480+(424-480)*move,cy=370+(311-370)*move;
 cursor.style.transform=`translate(${cx}px,${cy}px)`;cursor.style.opacity=String(reduce.matches?0:pulse(time,1.2,1.32,1.95,2.12));
 document.querySelector('#scrub').value=current;document.querySelector('#time').textContent=current.toFixed(1)+' / 9.5s';
 return {time:current,phase:hero.dataset.phase,scroll,clicks};
}
window.seek=seek;window.duration=duration;
window.ready=(async()=>{await document.fonts.ready;setup();seek(0);if(location.hash==='#render')document.documentElement.classList.add('render');else requestAnimationFrame(loop);return true})();
function loop(now){if(last&&playing&&!reduce.matches)seek((current+(now-last)/1000)%duration);last=now;requestAnimationFrame(loop)}
window.runDemo=()=>new Promise(resolve=>{const start=performance.now();const run=now=>{seek(Math.min((now-start)/1000,duration));if(current<duration)requestAnimationFrame(run);else resolve()};requestAnimationFrame(run)});
window.runComposition=window.runDemo;window.runSnippet=window.runDemo;window.showIntroInstant=()=>seek(1.15);window.snippetRect=()=>({x:240,y:56,w:1120,h:1144});
addEventListener('resize',()=>{if(ready)fit()});reduce.addEventListener('change',()=>seek(0));
document.querySelector('#play').onclick=()=>{playing=!playing;document.querySelector('#play').textContent=playing?'Pause':'Play'};
document.querySelector('#scrub').oninput=e=>{playing=false;seek(+e.target.value)};
