import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const p=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
try{
await p.goto(new URL('../previews/brand-grid-reveal-directed.html#render',import.meta.url).href);await p.evaluate(()=>window.ready);
const at=async t=>p.evaluate(t=>{seek(t);return filmAudit()},t);
await at(1.2);assert.ok(await p.evaluate(()=>[...document.querySelector('[data-component="heading"]').children].some(n=>+n.style.opacity>.99)),'Headline established early');
assert.equal((await at(2.5)).visible,72);assert.equal(await p.locator('#code-status').textContent(),'Building');
assert.equal(await p.locator('#code-lines').evaluate(n=>getComputedStyle(n).fontSize),'11px');
await at(3.7);assert.equal(await p.locator('#code-widget').evaluate(n=>+n.style.opacity),0,'Code fades during the opening photo expansion');
await at(4);const a=await p.evaluate(()=>revealAudit());a.photos.forEach(p=>{for(const k of ['x','y','width','height'])assert.ok(Math.abs(p.actual[k]-p.destination[k])<.05)});
assert.deepEqual((await at(6.1)).values,['1.3k','72%','72 of 100 GB used','15']);
assert.equal((await at(7.65)).visible,72,'Full product holds before retirement');
for(const t of [.2,.5,.8,1.2,1.6,2,2.5]){await at(t);assert.equal(await p.evaluate(()=>revealAudit().textOverlap),0);}
await at(0);const first=await p.screenshot();await at(9.5);const last=await p.screenshot();assert.equal(createHash('sha256').update(first).digest('hex'),createHash('sha256').update(last).digest('hex'));
for(const t of [0,.5,1.2,2,2.65,3.15,3.8,4.5,5.7,6.5,7.65,8.2,8.9,9.48]){await at(t);await p.screenshot({path:fileURLToPath(new URL(`../exports/stills/archive/directed-${t}.png`,import.meta.url))});}
await p.emulateMedia({reducedMotion:'reduce'});const r=await at(0);assert.equal(r.visible,r.parts);assert.equal(r.wireVisible,0);assert.equal(await p.locator('#code-widget').evaluate(n=>+n.style.opacity),0);assert.deepEqual(errors,[]);
writeFileSync(new URL('../exports/reports/directed-validation-report.json',import.meta.url),JSON.stringify({passed:true,checks:['early headline','complete UI at 2.5s','11px Paper Mono','code-to-product handoff','exact photo destinations','metric final state','product hold','no text overlap','identical seam','reduced motion','no resource errors']},null,2));
console.log('Directed cut checks passed');
}finally{await browser.close()}
