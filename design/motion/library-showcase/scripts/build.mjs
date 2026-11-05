// Builds previews/library-showcase.html: one self-contained file with the
// library's real :root tokens, Aspekta (OFL, base64) and griddy-icons glyphs.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';

const job = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(job, '../../..');
const require = createRequire(join(repo, 'package.json'));
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');

// The tokens exactly as consumers get them: the generated :root block only
// (the @theme inline map is Tailwind-only, the density blocks are unused).
const tokensFile = fs.readFileSync(join(repo, 'apps/storybook/styles/tokens.generated.css'), 'utf8');
const rootStart = tokensFile.indexOf('\n:root {');
const rootEnd = tokensFile.indexOf('\n}', rootStart) + 2;
if (rootStart < 0) throw Error('tokens :root block not found');
const tokens = tokensFile.slice(rootStart, rootEnd);

const font = fs.readFileSync(join(repo, 'registry/fonts/aspekta/AspektaVF.woff2')).toString('base64');
const fontCSS = `@font-face{font-family:Aspekta;src:url(data:font/woff2;base64,${font}) format('woff2-variations');font-weight:100 900;font-display:block}`;

const ICON_NAMES = ['Check', 'Search', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'Plus', 'CheckCircle', 'Close', 'ArrowUp', 'PauseCircle'];
const icons = {};
for (const name of ICON_NAMES) {
  const glyph = require(join(repo, `node_modules/griddy-icons/dist/icons/${name}/regular.cjs`)).default;
  icons[name] = renderToStaticMarkup(React.createElement('svg', {viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true}, glyph));
}

const src = p => fs.readFileSync(join(job, 'source', p), 'utf8');
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diorama UI — Library showcase</title>
<style>${fontCSS}
${tokens}
${src('style.css')}</style>
${src('stage.html').replace(/\{\{icon:(\w+)\}\}/g, (_, n) => {
  if (!icons[n]) throw Error(`icon ${n} not embedded`);
  return icons[n];
})}
<script>const ICONS=${JSON.stringify(icons)};
${src('timeline.js')}</script>
</html>
`;
fs.mkdirSync(join(job, 'previews'), {recursive: true});
fs.writeFileSync(join(job, 'previews/library-showcase.html'), html);
fs.writeFileSync(join(job, 'previews/library-showcase-dark.html'), html.replace('<html lang="en">', '<html lang="en" data-scheme="dark">'));
console.log(`Built previews/library-showcase{,-dark}.html (${(html.length / 1024).toFixed(0)} KB)`);
