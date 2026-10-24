import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {mkdirSync,writeFileSync} from 'node:fs';
const pixelHash=b=>createHash('sha256').update(execFileSync('ffmpeg',['-v','error','-i','pipe:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{input:b,maxBuffer:20000000})).digest('hex');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
try{for(const mode of ['directed','slow','portrait']){
const portrait=mode==='portrait',slow=mode==='slow',duration=slow?16:9.5;
const p=await b.newPage({viewport:{width:portrait?1080:1600,height:portrait?1350:1200}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
await p.goto(new URL(`../previews/brand-grid-reveal-${mode}.html#render`,import.meta.url).href);await p.evaluate(()=>window.ready);
const map=t=>slow?(t<=2.5?t*3.6:t+6.5):t;const at=async t=>p.evaluate(t=>{seek(t);return filmAudit()},map(t));
assert.equal((await at(2.5)).visible,72);
assert.ok(await p.evaluate(()=>document.fonts.check('11px "Paper Mono"')&&document.fonts.check('16px Aspekta')&&[...document.fonts].every(f=>f.status!=='error')),'Embedded fonts loaded');
for(const t of [.2,.5,.8,1.2,1.6,2,2.5]){await at(t);assert.equal(await p.evaluate(()=>revealAudit().textOverlap),0);}
await at(3.05);const old=await p.locator('#code-lines').textContent(),opacity=await p.locator('#code-widget').evaluate(e=>+e.style.opacity);
await at(3.5);assert.notEqual(await p.locator('#code-lines').textContent(),old);const fading=await p.locator('#code-widget').evaluate(e=>+e.style.opacity);assert.ok(fading>0&&fading<opacity,'Code continues while fading');
await at(3.7);assert.equal(await p.locator('#code-widget').evaluate(e=>+e.style.opacity),0);
await at(2.8);assert.equal(await p.locator('#code-lines').evaluate(e=>getComputedStyle(e).fontSize),'11px');
if(portrait){
const expected={'#app':[32,208,1144,784],'#code-widget':[480,32,448,242]};
for(const [sel,rect] of Object.entries(expected)){const actual=await p.locator(sel).boundingBox();['x','y','width','height'].forEach((key,i)=>assert.ok(Math.abs(actual[key]-rect[i]*1.125)<.01,`${sel} ${key} matches Paper`));}
const content=await p.evaluate(()=>{const a=atoms.find(a=>a.key==='brand'&&parseFloat(a.target.style.width)===304);return a.target.getBoundingClientRect().toJSON()});
assert.ok(Math.abs(content.x-420*1.125)<.01&&Math.abs(content.y-505*1.125)<.05,'Paper content origin');
for(const t of [0,1,2.8,4,6,8,9.5]){await at(t);assert.equal(await p.locator('#ground').evaluate(e=>+e.style.opacity),.35,'Persistent background lattice');}
}
assert.deepEqual((await at(6.1)).values,['1.3k','72%','72 of 100 GB used','15']);
await p.evaluate(()=>seek(0));const a=await p.screenshot();await p.evaluate(t=>seek(t),duration);const z=await p.screenshot();assert.equal(pixelHash(a),pixelHash(z));
const dir=new URL(`../exports/stills/${mode}/`,import.meta.url);mkdirSync(dir,{recursive:true});for(const t of [1.2,2.8,3.5,6.1]){await at(t);await p.screenshot({path:fileURLToPath(new URL(`preview-${t}.png`,dir))});}
await p.emulateMedia({reducedMotion:'reduce'});const r=await at(0);assert.equal(r.visible,r.parts);assert.equal(r.wireVisible,0);assert.deepEqual(errors,[]);await p.close();console.log(`${mode}: continuation, typography, geometry, values, seam and reduced motion passed`);
}writeFileSync(new URL('../exports/reports/versions-validation.json',import.meta.url),JSON.stringify({passed:true},null,2));}finally{await b.close()}
