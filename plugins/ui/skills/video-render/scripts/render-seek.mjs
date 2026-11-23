// Deterministic alternative to render.mjs for pages with ready, seek(t), duration.
import fs from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
if(!process.env.PAGE||!process.env.OUT)throw Error('Set PAGE and OUT');
const width=Number(process.env.WIDTH||1600),height=Number(process.env.HEIGHT||1200),fps=60;
const output=resolve(process.env.OUT),exportsDir=dirname(dirname(output)),stem=basename(output,'.mp4');
const stills=join(exportsDir,'stills',stem),reports=join(exportsDir,'reports');
for(const d of [dirname(output),stills,reports])fs.mkdirSync(d,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
let encoder;
try{
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
 await page.goto(pathToFileURL(resolve(process.env.PAGE)).href+'#render');
 await page.evaluate(async()=>{await window.ready;await document.fonts.ready});
 const duration=await page.evaluate(()=>window.duration),frames=duration*fps;
 if(!Number.isInteger(frames)||frames<1)throw Error('duration × 60 must be a positive integer');
 const beats=process.env.BEATS?process.env.BEATS.split(',').map(Number):Array.from({length:8},(_,i)=>duration*(i+.5)/8);
 const samples=new Set([0,frames-1,...beats.map(t=>Math.round(t*fps))]);
 encoder=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-vf',`scale=${width}:${height}:flags=lanczos`,'-c:v','libx264','-preset','slow','-crf','15','-pix_fmt','yuv420p','-movflags','+faststart',output]);
 encoder.stderr.pipe(process.stderr);const done=once(encoder,'close');
 for(let i=0;i<frames;i++){
  await page.evaluate(t=>seek(t),i/fps);
  if(samples.has(i))await page.screenshot({path:join(stills,`frame-${String(i).padStart(4,'0')}.png`)});
  const data=await page.screenshot({type:'jpeg',quality:95});
  if(!encoder.stdin.write(data))await once(encoder.stdin,'drain');
  if(i%180===0)console.log(`${i}/${frames}`);
 }
 encoder.stdin.end();const [code]=await done;
 const fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 if(code||errors.length||fonts.some(f=>f.status==='error'))throw Error(JSON.stringify({code,errors,fonts}));
 fs.writeFileSync(join(reports,`${stem}.json`),JSON.stringify({width,height,duration,fps,frames,medianFilmGapMs:1000/fps,p99FilmGapMs:1000/fps,errors,fonts},null,2)+'\n');
 console.log(output);
}finally{await browser.close();if(encoder&&encoder.exitCode===null)encoder.kill()}
