/* FAUNÓPOLIS — tools/gerar-tabelas.js
   Gera as tabelas de dados (espécies, sprites, terrenos, decoração, instalações,
   funcionários, doenças, alimentos, etapas e eventos) a partir de js/config.js
   e as injeta no Manual do Jogo, entre marcadores <!--NOME--> ... <!--/NOME-->.
   Uso:  node tools/gerar-tabelas.js           (atualiza docs/MANUAL_DO_JOGO.html)
         node tools/gerar-tabelas.js --stdout  (apenas imprime)                 */
const fs = require('fs'), path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8').replace("'use strict';", ''));
const FP = window.FP;
const m = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const T = k => FP.TERRAINS[FP.T[k]].nome;
const sw = c => `<span class="sw" style="background:${c}"></span>`;
const out = {};

let o = '<table class="data"><thead><tr><th>Espécie</th><th>Bioma</th><th>Etapa</th><th>Preço</th><th>Espaço</th><th>Alimento/dia</th><th>Grupo mín.</th><th>Atrat.</th><th>Maturidade</th><th>Gestação</th><th>Ninhada</th><th>Vida</th><th>Fert./dia</th><th>Terrenos (afinidade)</th><th>Água</th><th>Vegetação desejada</th><th>Abrigo / Enriq.</th><th>Traços</th></tr></thead><tbody>\n';
Object.values(FP.SPECIES).forEach(s => {
  const st = Math.max(s.stage, FP.BIOMES[s.bioma].stage);
  o += `<tr><td><b>${s.nome}</b></td><td>${FP.BIOMES[s.bioma].nome}</td><td>${st}</td><td>${m(s.preco)}</td><td>${s.esp}</td><td>${s.qtd} · ${FP.FOODS[s.comida].nome.toLowerCase()}</td><td>${s.social}</td><td>${s.atr}</td><td>${s.mat} d</td><td>${s.gest} d</td><td>1–${s.ninhada}</td><td>${s.vida} d</td><td>${Math.round(s.fert * 100)}%</td><td>${Object.entries(s.terr).map(([k, v]) => T(k) + ' (' + v + ')').join(', ')}</td><td>${Math.round(s.agua * 100)}%</td><td>${s.fol}/tile${s.plantas.length ? '<br><small>' + s.plantas.map(p => FP.DECOS[p].nome).join(', ') + '</small>' : ''}</td><td>${s.abrigo ? 'Abrigo' : '—'}${s.enriq ? ' / ' + FP.DECOS[s.enriq].nome : ''}</td><td>${[s.pred ? 'predador' : '', s.nada ? 'nada' : '', s.voa ? 'voa' : '', 'vel. ' + s.vel].filter(Boolean).join(', ')}</td></tr>\n`;
});
out.SPECIES = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Espécie</th><th>Arquétipo</th><th>Compr. (px)</th><th>Largura (px)</th><th>Cor principal</th><th>Cor secundária</th><th>Parâmetros extras</th></tr></thead><tbody>\n';
Object.values(FP.SPECIES).forEach(s => {
  const v = s.vis;
  const det = Object.keys(v).filter(k => !['tipo', 'L', 'Wd', 'cor', 'cor2'].includes(k)).map(k => k + (typeof v[k] === 'string' && v[k].startsWith('#') ? ' ' + sw(v[k]) : '=' + v[k])).join(', ');
  o += `<tr><td>${s.nome}</td><td>${v.tipo}</td><td>${v.L}</td><td>${v.Wd}</td><td>${sw(v.cor)} ${v.cor}</td><td>${sw(v.cor2)} ${v.cor2}</td><td><small>${det}</small></td></tr>\n`;
});
out.SPRITES = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>ID</th><th>Terreno</th><th>Custo/tile</th><th>Cor base</th><th>Cor de detalhe</th><th>Etapa</th></tr></thead><tbody>\n';
FP.TERRAINS.forEach(t => o += `<tr><td>${t.id}</td><td>${t.nome}</td><td>${m(t.custo)}</td><td>${sw(t.cor)} ${t.cor}</td><td>${sw(t.cor2)} ${t.cor2}</td><td>${t.stage || 1}</td></tr>\n`);
out.TERRAINS = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Item</th><th>Custo</th><th>Tipo</th><th>Biomas</th><th>Função</th><th>Beleza</th><th>Física</th><th>Etapa</th></tr></thead><tbody>\n';
Object.values(FP.DECOS).forEach(d => o += `<tr><td>${d.nome}</td><td>${m(d.custo)}</td><td>${d.planta ? 'Vegetação' : 'Decoração'}</td><td>${d.biomas.map(b => FP.BIOMES[b].nome).join(', ') || '—'}</td><td>${[d.abrigo ? 'abrigo' : '', d.agua ? 'fonte de água' : '', d.enriq ? 'enriquecimento' : '', d.luz ? 'iluminação' : '', d.educa ? 'educativo' : '', d.foraRecinto ? 'só fora de recintos' : '', d.naAgua ? 'sobre a água' : ''].filter(Boolean).join(', ') || '—'}</td><td>+${d.beleza}</td><td>${d.copa ? 'copa (desenhada acima dos animais)' : d.bloqueia ? 'obstáculo sólido' : 'atravessável'}</td><td>${d.stage || 1}</td></tr>\n`);
out.DECOS = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Instalação</th><th>Tipo</th><th>Tamanho</th><th>Custo</th><th>Manut./dia</th><th>Atende</th><th>Venda</th><th>Custo merc.</th><th>Etapa</th><th>Descrição</th></tr></thead><tbody>\n';
Object.values(FP.BUILDINGS).forEach(b => o += `<tr><td>${b.icone} ${b.nome}</td><td>${b.tipo}</td><td>${b.w}×${b.h}</td><td>${m(b.custo)}</td><td>${m(b.manut)}</td><td>${b.atende || '—'}</td><td>${b.venda ? m(b.venda) : '—'}</td><td>${b.custoVenda ? m(b.custoVenda) : '—'}</td><td>${b.stage || 1}</td><td><small>${b.desc || ''}</small></td></tr>\n`);
out.BUILDINGS = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Função</th><th>Salário/dia</th><th>Contratação</th><th>Capacidade</th><th>Etapa</th><th>Responsabilidades</th></tr></thead><tbody>\n';
Object.values(FP.STAFF).forEach(s => o += `<tr><td>${s.icone} ${s.nome}</td><td>${m(s.salario)}</td><td>${m(s.salario * 5)}</td><td>${s.cap} ${s.unid}</td><td>${s.stage}</td><td>${s.desc}</td></tr>\n`);
out.STAFF = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Doença</th><th>Saúde perdida/hora</th><th>Contágio/dia</th><th>Dias de tratamento</th><th>Custo/dia</th><th>Sintoma relatado</th></tr></thead><tbody>\n';
Object.values(FP.DISEASES).forEach(d => o += `<tr><td>${d.nome}${d.aves ? ' <small>(só aves)</small>' : ''}</td><td>${d.sev}</td><td>${Math.round(d.contagio * 100)}%</td><td>${d.dias}</td><td>${m(d.custo)}</td><td><i>"… ${d.sintoma}"</i></td></tr>\n`);
out.DISEASES = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Alimento</th><th>Preço/unidade</th><th>Espécies que consomem</th></tr></thead><tbody>\n';
Object.entries(FP.FOODS).forEach(([k, f]) => o += `<tr><td>${f.icone} ${f.nome}</td><td>R$ ${f.preco.toFixed(2).replace('.', ',')}</td><td>${Object.values(FP.SPECIES).filter(s => s.comida === k).map(s => s.nome).join(', ')}</td></tr>\n`);
out.FOODS = o + '</tbody></table>';

const lbl = {rep: 'Reputação ≥ ', especies: 'Espécies diferentes ≥ ', visitantesTotal: 'Visitantes recebidos ≥ ', animais: 'Animais ≥ ', satisfacao: 'Satisfação ≥ ', lotes: 'Lotes de terreno ≥ ', bemEstar: 'Bem-estar médio ≥ ', dinheiro: 'Saldo ≥ R$ '};
o = '<table class="data"><thead><tr><th>Etapa</th><th>Nome</th><th>Requisitos</th><th>Prêmio</th><th>O que libera</th></tr></thead><tbody>\n';
FP.STAGES.slice(1).forEach(s => o += `<tr><td>${s.n}</td><td><b>${s.nome}</b></td><td>${s.req ? Object.entries(s.req).map(([k, v]) => lbl[k] + v.toLocaleString('pt-BR')).join('<br>') : 'Início do jogo'}</td><td>${s.premio ? m(s.premio) : '—'}</td><td>${s.desc}</td></tr>\n`);
out.STAGES = o + '</tbody></table>';

o = '<table class="data"><thead><tr><th>Evento</th><th>Custo</th><th>Duração</th><th>Procura extra</th><th>Requisito</th></tr></thead><tbody>\n';
Object.values(FP.EVENTS).forEach(e => o += `<tr><td>${e.icone} ${e.nome}</td><td>${m(e.custo)}</td><td>${e.dias} dias</td><td>+${Math.round(e.demanda * 100)}%</td><td>Etapa 4${e.exige ? ' + uma destas espécies: ' + e.exige.map(s => FP.SPECIES[s].nome).join(', ') : ''}</td></tr>\n`);
out.EVENTS = o + '</tbody></table>';

if (process.argv.includes('--stdout')){ Object.entries(out).forEach(([k, v]) => console.log(`<!--${k}-->\n${v}\n<!--/${k}-->`)); return; }
const file = path.join(__dirname, '..', 'docs', 'MANUAL_DO_JOGO.html');
let html = fs.readFileSync(file, 'utf8');
Object.entries(out).forEach(([k, v]) => {
  const re = new RegExp(`<!--${k}-->[\\s\\S]*?<!--/${k}-->`);
  html = html.replace(re, `<!--${k}-->\n${v}\n<!--/${k}-->`);
});
fs.writeFileSync(file, html);
console.log('Tabelas atualizadas em docs/MANUAL_DO_JOGO.html');
