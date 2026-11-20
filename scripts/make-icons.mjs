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
