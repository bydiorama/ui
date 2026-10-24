import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {dirname,join} from 'node:path';import {createRequire} from 'node:module';
const root=dirname(dirname(fileURLToPath(import.meta.url))),deps=process.env.MOTION_DEPS||'/tmp/brand-grid-tools/node_modules';
const require=createRequire(join(deps,'_resolve.cjs'));const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),esbuild=require('esbuild');
const source=fs.readFileSync(join(root,'source/paper.jsx'),'utf8').replace(/import \{ DotGrid \}[^;]+;/,'').replace(/\(\s*<div/,'const tree=(<div');
const js=esbuild.transformSync(source,{loader:'jsx',jsxFactory:'React.createElement'}).code;
const DotGrid=({style})=>React.createElement('div',{style:{...style,backgroundImage:'radial-gradient(circle,#11111114 .75px,transparent 1px)',backgroundSize:'16px 16px',backgroundPosition:'0 0'},'data-ground':'true'});
const tree=new Function('React','DotGrid',js+';return tree;')(React,DotGrid);
let markup=renderToStaticMarkup(tree).replace(/&quot;Aspekta-\d+&quot;, /g,'');
const font=fs.readFileSync(join(root,'../../../registry/fonts/aspekta/AspektaVF.woff2')).toString('base64');
const fontCSS=`@font-face{font-family:Aspekta;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-display:block}`;
const iconMarkup={};for(const name of ['Plus','ChevronRight','Check']){const glyph=require(join(deps,`griddy-icons/dist/icons/${name}/regular.cjs`)).default;iconMarkup[name]=renderToStaticMarkup(React.createElement('svg',{width:16,height:16,viewBox:'0 0 24 24',fill:'none','aria-hidden':true},glyph));}
const css=fs.readFileSync(join(root,'source/style.css'),'utf8'),timeline=fs.readFileSync(join(root,'source/timeline.js'),'utf8');
fs.writeFileSync(join(root,'previews/button-showcase.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Diorama — Button</title><style>${fontCSS}\n${css}</style><div id="stage">${markup}</div><div id="controls"><button id="play">Pause</button><input id="scrub" type="range" min="0" max="9.5" step=".016667" aria-label="Animation time"><span id="time"></span></div><script>const ICONS=${JSON.stringify(iconMarkup)};\n${timeline}</script></html>`);
console.log('Built offline button preview');
