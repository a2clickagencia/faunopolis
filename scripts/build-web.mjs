// Monta a pasta dist-web/ com o site do jogo (Cloudflare Pages / qualquer hospedagem estática)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-web');
fs.rmSync(out, {recursive: true, force: true});
const items = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets', 'docs', 'galeria-de-sprites.html'];
for (const it of items){
  const src = path.join(root, it);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, it), {recursive: true});
}
// cabeçalhos do Cloudflare Pages: sw.js e html sempre revalidados; o resto com cache
fs.writeFileSync(path.join(out, '_headers'), `/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/
  Cache-Control: no-cache
/js/*
  Cache-Control: public, max-age=3600
`);
// carimba a versão do cache do service worker
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const swp = path.join(out, 'sw.js');
const pre = ['./'];
const walkPre = (d, rel) => fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
  const r = rel ? rel + '/' + e.name : e.name;
  if (e.isDirectory()){ if (r !== 'docs') walkPre(path.join(d, e.name), r); }
  else if (!['_headers', 'sw.js', 'galeria-de-sprites.html'].includes(r)) pre.push(r);
});
walkPre(out, '');
fs.writeFileSync(swp, fs.readFileSync(swp, 'utf8').replace('__VERSION__', pkg.version + '-' + Date.now()).replace('__PRECACHE__', JSON.stringify(pre)));
let n = 0; const walk = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : n++); walk(out);
console.log(`dist-web pronto: ${n} arquivos`);
