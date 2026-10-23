// Behavioral and visual evidence for the presentation, run before rendering.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const b=await chromium.launch(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{});
const p=await b.newPage({viewport:{width:1600,height:1200}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
const dir=new URL('./exports/',import.meta.url);mkdirSync(dir,{recursive:true});
try{
 await p.goto(new URL('./brand-grid-reveal.html#render',import.meta.url).href);await p.evaluate(()=>window.ready);
 const at=async t=>p.evaluate(t=>{seek(t);return filmAudit()},t);
 assert.equal((await at(2.8)).sidebarRadius,'8px');assert.equal((await at(2.8)).photoGroups,3);
 assert.equal((await at(2.8)).globalEffects,0);assert.equal((await at(2.8)).gridLayers,1);
 assert.deepEqual((await at(2.8)).values,['1.2k','70%','70 of 100 GB used','14']);
 await at(.7);
 assert.ok((await at(1.2)).visible>=25,'Recognizable UI in the first 1.2 seconds');assert.equal((await at(3.2)).visible,72,'Complete UI by 3.2 seconds');await at(.7);
 const skeleton=await p.evaluate(()=>[...document.querySelectorAll('#connections rect')].filter(r=>r.getAttribute('fill')==='var(--skeleton-fill)'&&+r.style.opacity>.1).map(r=>({stroke:r.getAttribute('stroke'),h:+r.getAttribute('height')})));
 assert.ok(skeleton.length>0);assert.ok(skeleton.every(r=>r.stroke==='none'&&r.h>=6));
 const photoRects=async()=>p.evaluate(()=>[...document.querySelectorAll('[data-photo]')].map(w=>({transform:w.style.transform,rect:w.firstElementChild.getBoundingClientRect().toJSON()})));
 await at(2.8);const rest=await photoRects();await at(3.6);const expanded=await photoRects();
 assert.equal(new Set(expanded.map(r=>r.transform)).size,3);
 assert.ok(Math.max(...expanded.map(r=>r.rect.right))-Math.min(...expanded.map(r=>r.rect.x))>200,'Expansion reaches the wider Paper stack');
 expanded.forEach((v,i)=>{if(i<2)assert.notEqual(v.transform,rest[i].transform);assert.ok(v.rect.x>=928&&v.rect.right<=1232&&v.rect.y>=504&&v.rect.bottom<=705,'Photo stays inside preview');});
 await at(4.3);const settled=await photoRects();assert.deepEqual(settled,expanded);
 const detail=await p.evaluate(()=>revealAudit());
 detail.photos.forEach(p=>{for(const k of ['x','y','width','height'])assert.ok(Math.abs(p.actual[k]-p.destination[k])<.05,'Photo matches Paper destination');});
 assert.ok(detail.shell.border.includes('1px solid'));assert.notEqual(detail.shell.shadow,'none');
 assert.equal(await p.locator('#invite-feedback').count(),0);
 for(const t of [.04,.25,.5,.7,1,1.3,1.6,1.9,2.2,2.5,2.8]){await at(t);const a=await p.evaluate(()=>revealAudit());assert.equal(a.textOverlap,0,'Skeleton never overlays readable glyphs');for(const r of a.corners){if(t<=r.cue+.18)assert.equal(r.current,0);if(t>=r.cue+.57)assert.ok(Math.abs(r.current-r.final)<.01);}}
 await at(2.8);const before=await p.evaluate(()=>document.querySelector('[data-component="metric0"] svg path[stroke]').getAttribute('d'));
 await at(4.6);const after=await p.evaluate(()=>document.querySelector('[data-component="metric0"] svg path[stroke]').getAttribute('d'));assert.notEqual(after,before);
 assert.deepEqual((await at(6.2)).values,['1.3k','72%','72 of 100 GB used','15']);
 assert.equal(await p.evaluate(()=>+document.querySelector('[data-component="metric1"] svg').dataset.value),.72);
 for(const t of [2.8,4.3,4.75,5.45,6.2]){await at(t);assert.ok(await p.evaluate(()=>[...document.querySelectorAll('.t-digit-group')].every(g=>{const ys=[...g.children].map(e=>e.offsetTop);return Math.max(...ys)===Math.min(...ys)})),'Numbers must not wrap');}
 await at(0);const first=await p.screenshot();await at(9.5);const last=await p.screenshot();assert.equal(createHash('sha256').update(first).digest('hex'),createHash('sha256').update(last).digest('hex'));
 for(const t of [0,.7,1.6,2.8,3.6,4.3,4.8,5.6,6.2,7.4,9.48]){await at(t);await p.screenshot({path:fileURLToPath(new URL(`v6-${t}.png`,dir))});}
 await p.emulateMedia({reducedMotion:'reduce'});const reduced=await at(0);assert.equal(reduced.visible,reduced.parts);assert.equal(reduced.wireVisible,0);assert.deepEqual(reduced.values,['1.2k','70%','70 of 100 GB used','14']);assert.deepEqual(await photoRects(),rest);
 assert.deepEqual(errors,[]);
 const report={checks:['sidebar radius 8px','filled text skeletons, no text strokes','one grid, no global effects','photos expand to exact Paper positions','metric values and ring agree','sparkline responds to views update','no digit wrapping','no skeleton/text overlap','progressive corner radii','frame border and shadow','no invitation tooltip','pixel-identical unencoded loop seam','reduced-motion static initial state','no resource/page errors'],passed:true};
 writeFileSync(new URL('validation-report.json',dir),JSON.stringify(report,null,2));console.log(report);
}finally{await b.close();}
