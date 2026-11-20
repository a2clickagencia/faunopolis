// Gera os ícones PNG (app de PC e site instalável) a partir de assets/favicon.svg
import {Resvg} from '@resvg/resvg-js';
import fs from 'node:fs';
const svg = fs.readFileSync(new URL('../assets/favicon.svg', import.meta.url));
const out = (size, file) => {
  const png = new Resvg(svg, {fitTo: {mode: 'width', value: size}}).render().asPng();
  fs.mkdirSync(new URL('.', new URL(file, import.meta.url)), {recursive: true});
  fs.writeFileSync(new URL(file, import.meta.url), png);
  console.log('ícone', size, '->', file);
};
out(512, '../build/icon.png');
out(192, '../assets/icon-192.png');
out(512, '../assets/icon-512.png');
out(180, '../assets/icon-180.png');   // iPhone / iPad (Adicionar à Tela de Início)
// Android "maskable": o símbolo a 80% sobre fundo verde, para o recorte redondo/quadrado do sistema
const inner = svg.toString('utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512"><rect width="128" height="128" fill="#1F6B4A"/><g transform="translate(12.8 12.8) scale(.8)">${inner}</g></svg>`;
fs.writeFileSync(new URL('../assets/icon-maskable-512.png', import.meta.url), new Resvg(mask, {fitTo: {mode: 'width', value: 512}}).render().asPng());
console.log('ícone maskable 512 -> ../assets/icon-maskable-512.png');
