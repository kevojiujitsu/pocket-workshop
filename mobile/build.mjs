import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('www',{recursive:true});
await cp('../dist','www',{recursive:true});
await build({entryPoints:['entry.js'],bundle:true,format:'esm',outfile:'www/native-entry.js',target:'es2022'});
const html=(await readFile('www/index.html','utf8')).replace('<script type="module" src="app.js"></script>','<script type="module" src="native-entry.js"></script>').replaceAll('<br>','<br> ');
await writeFile('www/index.html',html);
console.log('Native web assets built. Store configuration is still required before live billing.');
