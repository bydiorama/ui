import assert from 'node:assert/strict';import {writeFileSync,mkdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const hash=b=>createHash('sha256').update(execFileSync('ffmpeg',['-v','error','-i','pipe:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{input:b,maxBuffer:20e6})).digest('hex');
const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE}),p=await b.newPage({viewport:{width:1600,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
try{
 await p.goto(new URL('../previews/button-showcase.html#render',import.meta.url).href);await p.evaluate(()=>window.ready);
 const at=t=>p.evaluate(t=>seek(t),t);
 await at(1.15);assert.equal(await p.evaluate(()=>document.fonts.check('16px Aspekta')),true);
 const geometry=await p.evaluate(()=>({sheet:[sheet.offsetLeft,sheet.offsetTop,sheet.offsetWidth],hero:[hero.offsetLeft,hero.offsetTop,hero.offsetWidth,hero.offsetHeight],sizes:sizes.map(n=>n.offsetHeight),variants:variants.length}));
 assert.deepEqual(geometry.sheet,[240,56,1120]);assert.deepEqual(geometry.hero.slice(2),[164,44]);assert.deepEqual(geometry.sizes,[44,44,44,32,32,32,24,24,24]);assert.equal(geometry.variants,5);
 await at(1.8);assert.equal(await p.locator('#hero-button').evaluate(e=>e.style.transform),'scale(0.96)');
 await at(2.3);assert.equal(await p.locator('#hero-button').getAttribute('aria-busy'),'true');
 assert.equal(await p.evaluate(()=>document.activeElement===hero&&!hero.disabled),true);
 const n=await p.evaluate(()=>clicks);await p.locator('#hero-button').evaluate(e=>e.click());assert.equal(await p.evaluate(()=>clicks),n,'Busy refuses activation');
 assert.equal(await p.locator('#hero-button').evaluate(e=>e.offsetWidth),164);
 await at(3);assert.equal(await p.locator('#hero-button').textContent(),'Created');assert.equal(await p.locator('#hero-button').evaluate(e=>e.offsetWidth),164);
 for(const t of [.1,.25,.4,.5,.6,.75,.9]){await at(t);assert.equal(await p.evaluate(()=>reveals.filter(a=>a.isText&&+a.node.style.opacity>.001&&+a.outline.style.opacity>.001).length),0,'Skeletons clear before glyphs');}
 await at(4.8);assert.ok(await p.evaluate(()=>sizes.every(n=>{const r=n.getBoundingClientRect();return r.y>=0&&r.bottom<1200})),'All sizes visible');
 await at(6.2);assert.ok(await p.evaluate(()=>variants.every(n=>{const r=n.getBoundingClientRect();return r.y>=0&&r.bottom<1200})),'All variant focus states visible');
 await at(0);const first=await p.screenshot();await at(9.5);assert.equal(hash(first),hash(await p.screenshot()),'Exact loop endpoints');
 const dir=new URL('../exports/stills/qa/',import.meta.url);mkdirSync(dir,{recursive:true});for(const t of [.4,1.15,1.8,2.3,3,4.8,6.2,8.2]){await at(t);await p.screenshot({path:fileURLToPath(new URL(`preview-${t}.png`,dir))});}
 await p.emulateMedia({reducedMotion:'reduce'});await at(0);assert.equal(await p.locator('#sheet').evaluate(e=>+e.style.opacity),1);assert.equal(await p.locator('#cursor').evaluate(e=>+e.style.opacity),0);assert.equal(await p.locator('#drawings').evaluate(e=>getComputedStyle(e).display),'none');
 assert.deepEqual(errors,[]);mkdirSync(new URL('../exports/reports/',import.meta.url),{recursive:true});writeFileSync(new URL('../exports/reports/validation.json',import.meta.url),JSON.stringify({passed:true,geometry,checks:['Paper composition','native button states','busy focus and activation guard','stable width','exact size heights','skeleton separation','visible focus examples','decoded endpoint equality','reduced motion','embedded fonts','no resource errors']},null,2));console.log('Button preview checks passed');
}finally{await b.close()}
