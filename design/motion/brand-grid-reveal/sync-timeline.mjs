// Keep the editable timeline and the offline single-file preview synchronized.
import {readFileSync,writeFileSync} from 'node:fs';
const html=new URL('./brand-grid-reveal.html',import.meta.url);
const source=readFileSync(html,'utf8');
const timeline=readFileSync(new URL('./timeline.js',import.meta.url),'utf8');
writeFileSync(html,source.slice(0,source.indexOf('<script>'))+'<script>\n'+timeline+'\n</script></html>');
