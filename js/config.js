/* =========================================================
   FAUNÓPOLIS — config.js
   Constantes, dados de terrenos, biomas, espécies, objetos,
   funcionários, doenças, etapas e balanceamento.
   ========================================================= */
'use strict';
const FP = window.FP = {};

FP.VERSION = '7.1.0';
FP.TILE = 32;            // pixels por tile no zoom 1
FP.W = 160;              // largura do mapa (tiles) — v2.0: mapa 4,8x maior
FP.H = 120;              // altura do mapa (tiles)
FP.OX = 40;              // deslocamento da área inicial (múltiplo de 8: mantém os lotes alinhados com saves da v1)
FP.OY = 64;
FP.V1 = {W: 72, H: 56};  // dimensões do mapa da v1 (para migrar jogos salvos)
FP.CHUNK = 8;            // tamanho de um lote de terreno (8x8 tiles)
FP.HOUR_SEC = 6;         // segundos reais por hora de jogo (velocidade 1x)
FP.OPEN_H = 8;           // abertura do parque
FP.CLOSE_H = 20;         // fechamento do parque
FP.DAYS_PER_MONTH = 30;
FP.MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* Paleta da marca (ver Manual da Marca) */
FP.BRAND = {
  verdeSelva:'#1F6B4A', verdeBroto:'#7BC86C', ouroSavana:'#F2B33D',
  coralArara:'#E8574B', azulLagoa:'#2E8FB8', cremeAreia:'#FFF4DE', grafiteNoite:'#1E2A2F'
};

/* ---------------- Terrenos ---------------- */
FP.TERRAINS = [
  {id:0, key:'grama',    nome:'Grama',                 cor:'#6fae4f', cor2:'#5f9c43', custo:4},
  {id:1, key:'savana',   nome:'Capim de savana',       cor:'#cdb85e', cor2:'#b9a24a', custo:8},
  {id:2, key:'areia',    nome:'Areia',                 cor:'#ead6a0', cor2:'#d9c286', custo:8},
  {id:3, key:'lama',     nome:'Lama / brejo',          cor:'#8b6d48', cor2:'#76593a', custo:8},
  {id:4, key:'neve',     nome:'Neve',                  cor:'#eef5f8', cor2:'#d6e5ec', custo:12},
  {id:5, key:'agua',     nome:'Água (lago)',           cor:'#3a8fc6', cor2:'#2f7fb4', custo:22},
  {id:6, key:'floresta', nome:'Solo de floresta',      cor:'#3f7a3a', cor2:'#33682f', custo:8},
  {id:7, key:'pedra',    nome:'Rochoso',               cor:'#a19e93', cor2:'#8a877d', custo:10},
  {id:8, key:'cerrado',  nome:'Cerrado (terra roxa)',  cor:'#b9874f', cor2:'#a47442', custo:8},
  {id:9, key:'gelo',     nome:'Gelo',                  cor:'#bfe4f2', cor2:'#a6d5e8', custo:14},
  {id:10,key:'mistico',  nome:'Solo místico',          cor:'#7d63b8', cor2:'#6a51a4', custo:30, stage:5}
];
FP.T = {}; FP.TERRAINS.forEach(t => FP.T[t.key] = t.id);

/* ---------------- Biomas ---------------- */
FP.BIOMES = {
  savana:     {nome:'África — Savana',             cor:'#F2B33D', icone:'🦁', stage:1, terreno:'savana'},
  brasil:     {nome:'Brasil — Floresta e Cerrado', cor:'#1F6B4A', icone:'🦜', stage:1, terreno:'floresta'},
  pantanal:   {nome:'Manguezal e Pantanal',        cor:'#2E8FB8', icone:'🐊', stage:2, terreno:'lama'},
  deserto:    {nome:'Região árida e desértica',    cor:'#D9A35B', icone:'🐪', stage:2, terreno:'areia'},
  asia:       {nome:'Ásia — Florestas tropicais',  cor:'#C8553D', icone:'🐯', stage:3, terreno:'floresta'},
  polar:      {nome:'Região polar',                cor:'#7FC8E8', icone:'🐧', stage:4, terreno:'neve'},
  fantastico: {nome:'Área fantástica',             cor:'#8A5CD1', icone:'🐉', stage:5, terreno:'mistico'}
};

/* ---------------- Alimentos ---------------- */
FP.FOODS = {
  feno:     {nome:'Feno e folhagens', preco:1.5, cor:'#c9b458', icone:'🌾'},
  frutas:   {nome:'Frutas',           preco:3,   cor:'#e8774b', icone:'🍎'},
  sementes: {nome:'Sementes e grãos', preco:2,   cor:'#b08850', icone:'🌰'},
  insetos:  {nome:'Insetos',          preco:4,   cor:'#6b8e23', icone:'🐛'},
  carne:    {nome:'Carne',            preco:6,   cor:'#c0392b', icone:'🥩'},
  peixe:    {nome:'Peixe',            preco:5,   cor:'#5dade2', icone:'🐟'},
  essencia: {nome:'Essência mística', preco:30,  cor:'#a46ee0', icone:'✨', stage:5}
};

/* ---------------- Espécies ----------------
 terr: afinidade com terrenos (0..1)   fol: densidade de plantas desejada (plantas/tile)
 plantas: tipos de vegetação apreciados   agua: fração de água desejada
 abrigo/enriq: exige objeto   esp: tiles por adulto   comida/qtd: alimento por dia
 atr: atratividade   social: grupo mínimo   mat: dias até maturidade   gest: dias de gestação
 ninhada: filhotes máx.   vida: expectativa (dias)   fert: chance diária de reprodução
 pred: predador   nada: entra na água   voa: ave voadora   vel: velocidade (tiles/s)
 vis: parâmetros do sprite procedural */
FP.SPECIES = {
  /* ---- Savana ---- */
  zebra:{nome:'Zebra',plural:'zebras',bioma:'savana',terr:{savana:1,grama:.7,areia:.3},fol:.06,plantas:['acacia','capim','arbusto','baoba'],agua:.03,abrigo:false,enriq:null,esp:6,comida:'feno',qtd:6,preco:2800,atr:6,social:3,mat:25,gest:12,ninhada:1,vida:220,fert:.10,pred:false,nada:false,vel:1.5,stage:1,
    vis:{tipo:'quad',L:30,Wd:13,cor:'#f4f4f2',cor2:'#222',padrao:'listras',cab:7,cauda:9,crina:'#222'}},
  avestruz:{nome:'Avestruz',plural:'avestruzes',bioma:'savana',terr:{savana:1,areia:.8,grama:.5},fol:.03,plantas:['acacia','capim','arbusto'],agua:.02,abrigo:false,enriq:null,esp:5,comida:'sementes',qtd:4,preco:1800,atr:5,social:2,mat:18,gest:8,ninhada:3,vida:200,fert:.12,pred:false,nada:false,vel:2.0,stage:1,
    vis:{tipo:'ave',L:18,Wd:14,cor:'#3a3330',cor2:'#f1ece4',bico:'#e0b089',pescoco:12,cab:4,asas:'#2a2420',cauda:'#f6f2ea'}},
  suricato:{nome:'Suricato',plural:'suricatos',bioma:'savana',terr:{areia:1,savana:.8,pedra:.5},fol:.02,plantas:['capim','arbusto'],agua:0,abrigo:true,enriq:'cupinzeiro',esp:1.5,comida:'insetos',qtd:1,preco:600,atr:5,social:5,mat:10,gest:6,ninhada:3,vida:120,fert:.14,pred:false,nada:false,vel:1.8,stage:1,
    vis:{tipo:'quad',L:11,Wd:5,cor:'#c9a87a',cor2:'#6b5238',padrao:'faixas',cab:3.2,cauda:7,olhos:'#3a2a1a'}},
  girafa:{nome:'Girafa',plural:'girafas',bioma:'savana',terr:{savana:1,grama:.6},fol:.12,plantas:['acacia','baoba'],agua:.02,abrigo:false,enriq:null,esp:12,comida:'feno',qtd:12,preco:9000,atr:9,social:2,mat:40,gest:20,ninhada:1,vida:300,fert:.07,pred:false,nada:false,vel:1.3,stage:2,
    vis:{tipo:'quad',L:30,Wd:13,cor:'#e8b45a',cor2:'#8a4f22',padrao:'manchas',cab:5,cauda:9,pescoco:20,chifres:true}},
  leao:{nome:'Leão',plural:'leões',bioma:'savana',terr:{savana:1,grama:.6,pedra:.5},fol:.04,plantas:['acacia','capim','baoba'],agua:.03,abrigo:true,enriq:null,esp:10,comida:'carne',qtd:7,preco:12000,atr:10,social:2,mat:35,gest:14,ninhada:2,vida:260,fert:.08,pred:true,nada:false,vel:1.4,stage:2,
    vis:{tipo:'quad',L:30,Wd:13,cor:'#d9a856',cor2:'#b8863c',padrao:'nenhum',cab:7,cauda:12,juba:'#8a5420'}},
  elefante:{nome:'Elefante-africano',plural:'elefantes',bioma:'savana',terr:{savana:1,grama:.7,lama:.6},fol:.06,plantas:['acacia','baoba','arbusto'],agua:.08,abrigo:false,enriq:null,esp:20,comida:'feno',qtd:30,preco:30000,atr:13,social:2,mat:60,gest:30,ninhada:1,vida:420,fert:.05,pred:false,nada:true,vel:1.0,stage:4,
    vis:{tipo:'elefante',L:42,Wd:26,cor:'#8d8a86',cor2:'#6f6c68',cab:11,cauda:6}},
  rinoceronte:{nome:'Rinoceronte',plural:'rinocerontes',bioma:'savana',terr:{savana:1,lama:.8,grama:.6},fol:.04,plantas:['acacia','arbusto'],agua:.05,abrigo:false,enriq:null,esp:16,comida:'feno',qtd:20,preco:25000,atr:12,social:1,mat:50,gest:28,ninhada:1,vida:380,fert:.05,pred:false,nada:false,vel:1.1,stage:4,
    vis:{tipo:'quad',L:38,Wd:20,cor:'#9a958c',cor2:'#7e7a72',padrao:'nenhum',cab:9,cauda:5,chifre:'#e8e2d0'}},
  /* ---- Brasil ---- */
  capivara:{nome:'Capivara',plural:'capivaras',bioma:'brasil',terr:{grama:1,lama:.9,floresta:.6},fol:.06,plantas:['arbusto','tropical','mangue','aguape'],agua:.15,abrigo:false,enriq:null,esp:3,comida:'feno',qtd:3,preco:900,atr:5,social:3,mat:14,gest:8,ninhada:3,vida:140,fert:.13,pred:false,nada:true,vel:1.2,stage:1,
    vis:{tipo:'quad',L:18,Wd:11,cor:'#8a6a45',cor2:'#6f5235',padrao:'nenhum',cab:5.5,cauda:0}},
  tucano:{nome:'Tucano',plural:'tucanos',bioma:'brasil',terr:{floresta:1,grama:.6},fol:.25,plantas:['tropical','palmeira','bromelia','ipe'],agua:.02,abrigo:false,enriq:null,esp:2,comida:'frutas',qtd:1.5,preco:1500,atr:6,social:2,mat:15,gest:6,ninhada:2,vida:150,fert:.12,pred:false,nada:false,voa:true,vel:2.2,stage:1,
    vis:{tipo:'ave',L:11,Wd:7,cor:'#1b1b1b',cor2:'#fbf3d0',bico:'#ff9d1c',bicoL:7,cab:3.2,asas:'#111',cauda:'#111'}},
  arara:{nome:'Arara-vermelha',plural:'araras',bioma:'brasil',terr:{floresta:1,grama:.6},fol:.25,plantas:['tropical','palmeira','ipe'],agua:.02,abrigo:false,enriq:'escalada',esp:2,comida:'sementes',qtd:1.5,preco:2200,atr:7,social:2,mat:16,gest:7,ninhada:2,vida:200,fert:.10,pred:false,nada:false,voa:true,vel:2.4,stage:1,
    vis:{tipo:'ave',L:13,Wd:7,cor:'#d62828',cor2:'#f7c948',bico:'#e8e0d0',bicoL:3,cab:3.4,asas:'#1d6fd1',cauda:'#d62828'}},
  tamandua:{nome:'Tamanduá-bandeira',plural:'tamanduás',bioma:'brasil',terr:{cerrado:1,grama:.7,savana:.6},fol:.06,plantas:['ipe','arbusto','capim'],agua:.02,abrigo:false,enriq:'cupinzeiro',esp:6,comida:'insetos',qtd:3,preco:4000,atr:7,social:1,mat:25,gest:14,ninhada:1,vida:180,fert:.07,pred:false,nada:false,vel:1.0,stage:2,
    vis:{tipo:'quad',L:22,Wd:9,cor:'#5b5148',cor2:'#1f1a16',padrao:'faixa',cab:3,focinho:8,cauda:13,caudaPeluda:true}},
  lobo_guara:{nome:'Lobo-guará',plural:'lobos-guarás',bioma:'brasil',terr:{cerrado:1,savana:.7,grama:.6},fol:.06,plantas:['ipe','arbusto','capim'],agua:.02,abrigo:true,enriq:null,esp:8,comida:'carne',qtd:2,preco:5500,atr:8,social:1,mat:22,gest:12,ninhada:2,vida:170,fert:.08,pred:true,nada:false,vel:1.7,stage:2,
    vis:{tipo:'quad',L:22,Wd:8,cor:'#d9672b',cor2:'#2b2018',padrao:'nenhum',cab:4.5,focinho:3,cauda:10,orelhas:4,crina:'#2b2018'}},
  onca:{nome:'Onça-pintada',plural:'onças',bioma:'brasil',terr:{floresta:1,grama:.6,lama:.5},fol:.15,plantas:['tropical','palmeira','bromelia'],agua:.08,abrigo:true,enriq:null,esp:10,comida:'carne',qtd:6,preco:14000,atr:11,social:1,mat:30,gest:13,ninhada:2,vida:240,fert:.07,pred:true,nada:true,vel:1.5,stage:2,
    vis:{tipo:'quad',L:28,Wd:12,cor:'#e3a740',cor2:'#2a1c10',padrao:'rosetas',cab:6,cauda:13}},
  anta:{nome:'Anta',plural:'antas',bioma:'brasil',terr:{floresta:1,lama:.9,grama:.6},fol:.12,plantas:['tropical','bromelia','arbusto'],agua:.12,abrigo:false,enriq:null,esp:8,comida:'frutas',qtd:8,preco:6000,atr:7,social:1,mat:30,gest:18,ninhada:1,vida:260,fert:.06,pred:false,nada:true,vel:1.1,stage:2,
    vis:{tipo:'quad',L:26,Wd:13,cor:'#4a3f38',cor2:'#3a312b',padrao:'nenhum',cab:6,focinho:3,cauda:2}},
  /* ---- Pantanal ---- */
  jacare:{nome:'Jacaré-do-pantanal',plural:'jacarés',bioma:'pantanal',terr:{lama:1,grama:.4},fol:.06,plantas:['mangue','aguape','arbusto'],agua:.35,abrigo:false,enriq:null,esp:5,comida:'peixe',qtd:3,preco:5000,atr:8,social:2,mat:40,gest:15,ninhada:3,vida:350,fert:.06,pred:true,nada:true,vel:0.7,stage:2,
    vis:{tipo:'reptil',L:34,Wd:9,cor:'#4f5d36',cor2:'#3a4527',cab:4,focinho:9,cauda:18}},
  ariranha:{nome:'Ariranha',plural:'ariranhas',bioma:'pantanal',terr:{lama:1,grama:.6,floresta:.5},fol:.06,plantas:['mangue','aguape','arbusto'],agua:.4,abrigo:true,enriq:null,esp:4,comida:'peixe',qtd:4,preco:5500,atr:8,social:3,mat:20,gest:10,ninhada:2,vida:160,fert:.09,pred:true,nada:true,vel:1.6,stage:2,
    vis:{tipo:'quad',L:20,Wd:7,cor:'#5a3d26',cor2:'#e9dcc4',padrao:'peito',cab:4,cauda:9}},
  tuiuiu:{nome:'Tuiuiú',plural:'tuiuiús',bioma:'pantanal',terr:{lama:1,grama:.6},fol:.05,plantas:['mangue','aguape','palmeira'],agua:.2,abrigo:false,enriq:null,esp:4,comida:'peixe',qtd:2,preco:3500,atr:7,social:2,mat:20,gest:9,ninhada:2,vida:220,fert:.08,pred:false,nada:true,voa:true,vel:1.3,stage:2,
    vis:{tipo:'ave',L:16,Wd:10,cor:'#fafafa',cor2:'#222',bico:'#1a1a1a',bicoL:9,pescoco:5,colar:'#d42a2a',cab:3.5,asas:'#f2f2f2',cauda:'#eee'}},
  /* ---- Deserto ---- */
  feneco:{nome:'Raposa-do-deserto',plural:'raposas-do-deserto',bioma:'deserto',terr:{areia:1,pedra:.6},fol:.03,plantas:['cacto','arbusto_seco'],agua:0,abrigo:true,enriq:null,esp:2,comida:'insetos',qtd:1.5,preco:2500,atr:7,social:2,mat:14,gest:8,ninhada:2,vida:150,fert:.10,pred:true,nada:false,vel:1.8,stage:2,
    vis:{tipo:'quad',L:13,Wd:6,cor:'#f0d6a4',cor2:'#d8b77c',padrao:'nenhum',cab:3.6,focinho:2,cauda:8,orelhas:5,caudaPeluda:true}},
  camelo:{nome:'Camelo',plural:'camelos',bioma:'deserto',terr:{areia:1,pedra:.6,savana:.5},fol:.02,plantas:['cacto','arbusto_seco','palmeira'],agua:0,abrigo:false,enriq:null,esp:12,comida:'feno',qtd:12,preco:8000,atr:7,social:2,mat:40,gest:22,ninhada:1,vida:320,fert:.06,pred:false,nada:false,vel:1.2,stage:2,
    vis:{tipo:'quad',L:32,Wd:12,cor:'#c69a62',cor2:'#a97f4b',padrao:'nenhum',cab:5,cauda:6,pescoco:9,corcova:2}},
  tartaruga:{nome:'Jabuti',plural:'jabutis',bioma:'deserto',terr:{areia:1,pedra:.8,grama:.6,cerrado:.6},fol:.04,plantas:['cacto','arbusto_seco','arbusto'],agua:0,abrigo:true,enriq:null,esp:3,comida:'feno',qtd:1,preco:1500,atr:4,social:2,mat:60,gest:20,ninhada:3,vida:900,fert:.05,pred:false,nada:false,vel:0.35,stage:2,
    vis:{tipo:'casco',L:15,Wd:12,cor:'#6d5a2e',cor2:'#c49a3c',cab:3}},
  /* ---- Ásia ---- */
  tigre:{nome:'Tigre',plural:'tigres',bioma:'asia',terr:{floresta:1,grama:.7},fol:.15,plantas:['tropical','bambu','samambaia'],agua:.08,abrigo:true,enriq:null,esp:12,comida:'carne',qtd:8,preco:20000,atr:12,social:1,mat:35,gest:14,ninhada:2,vida:250,fert:.07,pred:true,nada:true,vel:1.5,stage:3,
    vis:{tipo:'quad',L:32,Wd:13,cor:'#e8812a',cor2:'#1c1410',padrao:'listras',cab:7,cauda:13}},
  panda_vermelho:{nome:'Panda-vermelho',plural:'pandas-vermelhos',bioma:'asia',terr:{floresta:1,grama:.6},fol:.3,plantas:['bambu','tropical','samambaia'],agua:.02,abrigo:false,enriq:'escalada',esp:3,comida:'feno',qtd:2,preco:9000,atr:9,social:1,mat:20,gest:12,ninhada:2,vida:180,fert:.08,pred:false,nada:false,vel:1.1,stage:3,
    vis:{tipo:'quad',L:15,Wd:8,cor:'#c2491d',cor2:'#2b1a12',padrao:'nenhum',cab:4.5,cauda:11,caudaAneis:'#f1d9b5',orelhas:3,caudaPeluda:true}},
  gibao:{nome:'Gibão',plural:'gibões',bioma:'asia',terr:{floresta:1,grama:.5},fol:.3,plantas:['tropical','bambu','samambaia'],agua:.02,abrigo:false,enriq:'escalada',esp:4,comida:'frutas',qtd:2,preco:7000,atr:8,social:2,mat:30,gest:14,ninhada:1,vida:250,fert:.07,pred:false,nada:false,vel:1.9,stage:3,
    vis:{tipo:'primata',L:12,Wd:9,cor:'#3b2f28',cor2:'#d8c6a8',cab:4,bracos:11}},
  orangotango:{nome:'Orangotango',plural:'orangotangos',bioma:'asia',terr:{floresta:1,grama:.4},fol:.25,plantas:['tropical','bambu','samambaia'],agua:.02,abrigo:true,enriq:'escalada',esp:10,comida:'frutas',qtd:6,preco:22000,atr:11,social:2,mat:60,gest:30,ninhada:1,vida:400,fert:.04,pred:false,nada:false,vel:0.9,stage:4,
    vis:{tipo:'primata',L:20,Wd:15,cor:'#b8561e',cor2:'#e3a47a',cab:6,bracos:14}},
  /* ---- Polar ---- */
  pinguim:{nome:'Pinguim',plural:'pinguins',bioma:'polar',terr:{neve:1,gelo:1,pedra:.5},fol:0,plantas:[],agua:.35,abrigo:false,enriq:'gelo_bloco',esp:2,comida:'peixe',qtd:2,preco:2000,atr:9,social:4,mat:18,gest:9,ninhada:2,vida:200,fert:.11,pred:false,nada:true,vel:0.9,stage:4,
    vis:{tipo:'pinguim',L:12,Wd:9,cor:'#1d2229',cor2:'#f7f7f7',bico:'#f39c12',cab:4}},
  urso_polar:{nome:'Urso-polar',plural:'ursos-polares',bioma:'polar',terr:{neve:1,gelo:1,pedra:.6},fol:0,plantas:[],agua:.25,abrigo:true,enriq:'gelo_bloco',esp:16,comida:'peixe',qtd:12,preco:28000,atr:12,social:1,mat:45,gest:20,ninhada:2,vida:300,fert:.05,pred:true,nada:true,vel:1.2,stage:4,
    vis:{tipo:'quad',L:34,Wd:17,cor:'#f5f2e8',cor2:'#e3ddcc',padrao:'nenhum',cab:7,focinho:3,cauda:2,orelhas:2.5}},
  raposa_artica:{nome:'Raposa-do-ártico',plural:'raposas-do-ártico',bioma:'polar',terr:{neve:1,gelo:.8,pedra:.7},fol:.02,plantas:['pinheiro'],agua:0,abrigo:true,enriq:null,esp:3,comida:'carne',qtd:2,preco:4500,atr:7,social:2,mat:16,gest:9,ninhada:3,vida:150,fert:.10,pred:true,nada:false,vel:1.8,stage:4,
    vis:{tipo:'quad',L:15,Wd:7,cor:'#fbfbfb',cor2:'#e2e6ea',padrao:'nenhum',cab:4,focinho:2,cauda:10,orelhas:2.5,caudaPeluda:true}},
  /* ---- Fantástico ---- */
  unicornio:{nome:'Unicórnio',plural:'unicórnios',bioma:'fantastico',terr:{mistico:1,grama:.7},fol:.1,plantas:['arvore_mistica','cristal'],agua:.05,abrigo:false,enriq:null,esp:12,comida:'essencia',qtd:2,preco:60000,atr:18,social:2,mat:50,gest:25,ninhada:1,vida:900,fert:.04,pred:false,nada:false,vel:1.6,stage:5,
    vis:{tipo:'quad',L:30,Wd:12,cor:'#fbf7ff',cor2:'#e9dcff',padrao:'nenhum',cab:6,cauda:11,crina:'#f49ac1',chifreEspiral:'#f7d774',caudaPeluda:true}},
  grifo:{nome:'Grifo',plural:'grifos',bioma:'fantastico',terr:{mistico:1,pedra:.9},fol:.04,plantas:['arvore_mistica','cristal'],agua:.03,abrigo:true,enriq:null,esp:14,comida:'carne',qtd:10,preco:80000,atr:20,social:1,mat:55,gest:20,ninhada:1,vida:800,fert:.03,pred:true,nada:false,voa:true,vel:1.7,stage:5,
    vis:{tipo:'grifo',L:32,Wd:13,cor:'#c9a25c',cor2:'#f3efe6',cab:5,cauda:11,asas:'#8a6a3a',bico:'#f2c14e'}},
  dragao:{nome:'Dragão',plural:'dragões',bioma:'fantastico',terr:{mistico:1,pedra:1,lama:.5},fol:.02,plantas:['cristal','arvore_mistica'],agua:.05,abrigo:true,enriq:'cristal',esp:24,comida:'carne',qtd:20,preco:150000,atr:30,social:1,mat:80,gest:35,ninhada:1,vida:2000,fert:.02,pred:true,nada:true,voa:true,vel:1.3,stage:5,
    vis:{tipo:'dragao',L:52,Wd:16,cor:'#2f8f5b',cor2:'#e6c45a',cab:7,focinho:6,cauda:28,asas:'#1e6a42'}},
  fenix:{nome:'Fênix',plural:'fênix',bioma:'fantastico',terr:{mistico:1,pedra:.7,areia:.6},fol:.04,plantas:['cristal','arvore_mistica'],agua:0,abrigo:false,enriq:'cristal',esp:6,comida:'essencia',qtd:2,preco:90000,atr:22,social:1,mat:40,gest:20,ninhada:1,vida:3000,fert:.03,pred:false,nada:false,voa:true,vel:2.2,stage:5,
    vis:{tipo:'ave',L:18,Wd:10,cor:'#ff6a1a',cor2:'#ffd23f',bico:'#ffe08a',bicoL:3,cab:4,asas:'#e8361c',cauda:'#ffb627',fogo:true}},

  /* ================= v2.0 — NOVAS ESPÉCIES ================= */
  /* ---- Savana ---- */
  impala:{nome:'Impala',plural:'impalas',bioma:'savana',terr:{savana:1,grama:.8},fol:.05,plantas:['acacia','capim','arbusto'],agua:.03,abrigo:false,enriq:null,esp:4,comida:'feno',qtd:3,preco:2200,atr:5,social:4,mat:16,gest:9,ninhada:1,vida:170,fert:.12,pred:false,nada:false,vel:2.1,stage:1,
    vis:{tipo:'quad',L:22,Wd:9,cor:'#c98a4a',cor2:'#f3e6d0',padrao:'peito',cab:4.5,cauda:5,chifresLongos:'#3a2a1a'}},
  gnu:{nome:'Gnu',plural:'gnus',bioma:'savana',terr:{savana:1,grama:.8},fol:.04,plantas:['acacia','capim'],agua:.04,abrigo:false,enriq:null,esp:6,comida:'feno',qtd:7,preco:3500,atr:6,social:4,mat:22,gest:12,ninhada:1,vida:220,fert:.10,pred:false,nada:false,vel:1.6,stage:1,
    vis:{tipo:'quad',L:30,Wd:13,cor:'#5d5650',cor2:'#3a3530',padrao:'nenhum',cab:6,cauda:9,crina:'#1e1a18',chifresLongos:'#2a2420',chifresAbertos:true}},
  facocero:{nome:'Facocero',plural:'facoceros',bioma:'savana',terr:{savana:1,lama:.8,grama:.6},fol:.04,plantas:['capim','arbusto'],agua:.05,abrigo:true,enriq:null,esp:3,comida:'sementes',qtd:2,preco:1800,atr:5,social:2,mat:15,gest:8,ninhada:3,vida:150,fert:.13,pred:false,nada:false,vel:1.5,stage:1,
    vis:{tipo:'quad',L:20,Wd:11,cor:'#6b5a4a',cor2:'#3a2a1a',padrao:'nenhum',cab:6,focinho:4,cauda:6,crina:'#3a2a1a',chifres:true}},
  hiena:{nome:'Hiena-malhada',plural:'hienas',bioma:'savana',terr:{savana:1,pedra:.6,grama:.5},fol:.03,plantas:['acacia','capim'],agua:.03,abrigo:true,enriq:null,esp:7,comida:'carne',qtd:4,preco:6000,atr:7,social:3,mat:25,gest:11,ninhada:2,vida:220,fert:.08,pred:true,nada:false,vel:1.6,stage:2,
    vis:{tipo:'quad',L:24,Wd:11,cor:'#a8916a',cor2:'#4a3a2a',padrao:'manchas',cab:6,cauda:6,orelhas:3,crina:'#4a3a2a'}},
  guepardo:{nome:'Guepardo',plural:'guepardos',bioma:'savana',terr:{savana:1,grama:.8},fol:.04,plantas:['acacia','capim'],agua:.03,abrigo:true,enriq:null,esp:12,comida:'carne',qtd:5,preco:15000,atr:11,social:1,mat:30,gest:12,ninhada:2,vida:220,fert:.07,pred:true,nada:false,vel:2.4,stage:2,
    vis:{tipo:'quad',L:28,Wd:10,cor:'#e3b25a',cor2:'#2a1c10',padrao:'rosetas',cab:5,cauda:13}},
  babuino:{nome:'Babuíno',plural:'babuínos',bioma:'savana',terr:{savana:1,pedra:.9,grama:.6},fol:.06,plantas:['acacia','baoba','arbusto'],agua:.03,abrigo:false,enriq:'escalada',esp:3,comida:'frutas',qtd:2,preco:5000,atr:7,social:4,mat:28,gest:13,ninhada:1,vida:240,fert:.08,pred:false,nada:false,vel:1.5,stage:2,
    vis:{tipo:'primata',L:14,Wd:10,cor:'#8a7a5a',cor2:'#d98a8a',cab:4.2,bracos:10}},
  hipopotamo:{nome:'Hipopótamo',plural:'hipopótamos',bioma:'savana',terr:{lama:1,savana:.6,grama:.6},fol:.03,plantas:['arbusto','capim','aguape'],agua:.45,abrigo:false,enriq:null,esp:18,comida:'feno',qtd:25,preco:24000,atr:12,social:2,mat:55,gest:28,ninhada:1,vida:400,fert:.05,pred:false,nada:true,vel:.8,stage:3,
    vis:{tipo:'quad',L:36,Wd:22,cor:'#7d6a6e',cor2:'#c99aa0',padrao:'nenhum',cab:9,focinho:5,cauda:3,orelhas:2}},
  /* ---- Brasil ---- */
  mico_leao:{nome:'Mico-leão-dourado',plural:'micos-leões',bioma:'brasil',terr:{floresta:1,grama:.5},fol:.3,plantas:['tropical','bromelia','palmeira'],agua:.02,abrigo:false,enriq:'escalada',esp:1.5,comida:'frutas',qtd:.6,preco:3500,atr:8,social:3,mat:14,gest:7,ninhada:2,vida:150,fert:.12,pred:false,nada:false,vel:2.0,stage:1,
    vis:{tipo:'primata',L:8,Wd:6,cor:'#f08a1c',cor2:'#f7c06a',cab:3.2,bracos:7}},
  quati:{nome:'Quati',plural:'quatis',bioma:'brasil',terr:{floresta:1,grama:.7,cerrado:.6},fol:.12,plantas:['tropical','arbusto','bromelia'],agua:.03,abrigo:false,enriq:'escalada',esp:2,comida:'insetos',qtd:1.2,preco:1200,atr:5,social:3,mat:14,gest:8,ninhada:3,vida:140,fert:.13,pred:false,nada:false,vel:1.7,stage:1,
    vis:{tipo:'quad',L:15,Wd:7,cor:'#a0703a',cor2:'#5a3a1a',padrao:'nenhum',cab:3.5,focinho:4,cauda:12,caudaPeluda:true,caudaAneis:'#4a2a10'}},
  ema:{nome:'Ema',plural:'emas',bioma:'brasil',terr:{cerrado:1,savana:.8,grama:.7},fol:.03,plantas:['ipe','arbusto','capim'],agua:.02,abrigo:false,enriq:null,esp:5,comida:'sementes',qtd:3,preco:1500,atr:5,social:2,mat:18,gest:8,ninhada:3,vida:200,fert:.11,pred:false,nada:false,vel:2.0,stage:1,
    vis:{tipo:'ave',L:16,Wd:13,cor:'#8a8478',cor2:'#5a564e',bico:'#c9b48a',pescoco:11,cab:3.5,asas:'#7a746a',cauda:'#9a9488'}},
  preguica:{nome:'Bicho-preguiça',plural:'preguiças',bioma:'brasil',terr:{floresta:1,grama:.4},fol:.35,plantas:['tropical','ipe','palmeira'],agua:.01,abrigo:false,enriq:'escalada',esp:3,comida:'feno',qtd:1,preco:6000,atr:8,social:1,mat:30,gest:20,ninhada:1,vida:250,fert:.05,pred:false,nada:false,vel:.2,stage:2,
    vis:{tipo:'primata',L:13,Wd:10,cor:'#8f7f68',cor2:'#e6d8b8',cab:3.6,bracos:12}},
  veado_campeiro:{nome:'Veado-campeiro',plural:'veados-campeiros',bioma:'brasil',terr:{cerrado:1,grama:.8,savana:.6},fol:.05,plantas:['ipe','arbusto','capim'],agua:.03,abrigo:false,enriq:null,esp:5,comida:'feno',qtd:4,preco:4500,atr:6,social:2,mat:20,gest:12,ninhada:1,vida:180,fert:.09,pred:false,nada:false,vel:1.9,stage:2,
    vis:{tipo:'quad',L:22,Wd:9,cor:'#b9834a',cor2:'#f1e6d0',padrao:'peito',cab:4.5,cauda:3,galhada:'#7a5a3a'}},
  harpia:{nome:'Gavião-real (harpia)',plural:'harpias',bioma:'brasil',terr:{floresta:1,pedra:.5},fol:.25,plantas:['tropical','ipe','palmeira'],agua:.02,abrigo:false,enriq:'escalada',esp:6,comida:'carne',qtd:1.5,preco:18000,atr:11,social:1,mat:40,gest:15,ninhada:1,vida:300,fert:.05,pred:true,nada:false,voa:true,vel:2.0,stage:3,
    vis:{tipo:'ave',L:18,Wd:12,cor:'#7a7a7a',cor2:'#f2f2f2',bico:'#2a2a2a',bicoL:3,cab:4.5,asas:'#3a3a3a',cauda:'#4a4a4a'}},
  /* ---- Pantanal ---- */
  arara_azul:{nome:'Arara-azul',plural:'araras-azuis',bioma:'pantanal',terr:{grama:1,lama:.6,floresta:.8},fol:.2,plantas:['palmeira','mangue','tropical'],agua:.05,abrigo:false,enriq:'escalada',esp:2,comida:'sementes',qtd:1.5,preco:4500,atr:9,social:2,mat:18,gest:8,ninhada:2,vida:250,fert:.09,pred:false,nada:false,voa:true,vel:2.3,stage:2,
    vis:{tipo:'ave',L:14,Wd:7,cor:'#1f3fa8',cor2:'#f7d13a',bico:'#222',bicoL:3,cab:3.4,asas:'#2a4fc0',cauda:'#1f3fa8'}},
  flamingo:{nome:'Flamingo',plural:'flamingos',bioma:'pantanal',terr:{lama:1,areia:.6},fol:.02,plantas:['aguape','mangue'],agua:.35,abrigo:false,enriq:null,esp:2,comida:'peixe',qtd:1,preco:3000,atr:8,social:4,mat:20,gest:9,ninhada:1,vida:260,fert:.09,pred:false,nada:true,voa:true,vel:1.2,stage:2,
    vis:{tipo:'ave',L:14,Wd:8,cor:'#f49ac1',cor2:'#ffffff',bico:'#222',bicoL:5,pescoco:8,cab:3,asas:'#e8749a',cauda:'#f07aa8'}},
  cervo_pantanal:{nome:'Cervo-do-pantanal',plural:'cervos-do-pantanal',bioma:'pantanal',terr:{lama:1,grama:.8},fol:.06,plantas:['mangue','aguape','arbusto'],agua:.25,abrigo:false,enriq:null,esp:8,comida:'feno',qtd:6,preco:7500,atr:7,social:2,mat:28,gest:15,ninhada:1,vida:220,fert:.07,pred:false,nada:true,vel:1.5,stage:2,
    vis:{tipo:'quad',L:28,Wd:12,cor:'#a65a2a',cor2:'#2a1a10',padrao:'nenhum',cab:5,focinho:3,cauda:4,galhada:'#c9a46a'}},
  sucuri:{nome:'Sucuri',plural:'sucuris',bioma:'pantanal',terr:{lama:1,floresta:.6},fol:.06,plantas:['mangue','aguape'],agua:.4,abrigo:true,enriq:null,esp:6,comida:'peixe',qtd:3,preco:7000,atr:9,social:1,mat:45,gest:20,ninhada:3,vida:400,fert:.05,pred:true,nada:true,vel:.6,stage:2,
    vis:{tipo:'cobra',L:40,Wd:6,cor:'#4b5a2a',cor2:'#1e2410',cab:3.5,cauda:0}},
  /* ---- Deserto ---- */
  orix:{nome:'Órix',plural:'órix',bioma:'deserto',terr:{areia:1,pedra:.7,savana:.6},fol:.02,plantas:['cacto','arbusto_seco'],agua:0,abrigo:false,enriq:null,esp:7,comida:'feno',qtd:6,preco:7000,atr:7,social:3,mat:28,gest:16,ninhada:1,vida:260,fert:.07,pred:false,nada:false,vel:1.7,stage:2,
    vis:{tipo:'quad',L:28,Wd:11,cor:'#e9e0cc',cor2:'#2a2420',padrao:'faixa',cab:5,cauda:7,chifresLongos:'#2a2420'}},
  caracal:{nome:'Caracal',plural:'caracais',bioma:'deserto',terr:{areia:1,pedra:.8,savana:.6},fol:.02,plantas:['cacto','arbusto_seco'],agua:0,abrigo:true,enriq:null,esp:6,comida:'carne',qtd:2,preco:6500,atr:8,social:1,mat:22,gest:10,ninhada:2,vida:180,fert:.08,pred:true,nada:false,vel:2.0,stage:2,
    vis:{tipo:'quad',L:20,Wd:8,cor:'#c48a4e',cor2:'#8a5a2a',padrao:'nenhum',cab:4,cauda:6,orelhas:4.5}},
  monitor:{nome:'Lagarto-monitor',plural:'lagartos-monitores',bioma:'deserto',terr:{areia:1,pedra:.9},fol:.02,plantas:['cacto','arbusto_seco'],agua:.03,abrigo:true,enriq:null,esp:4,comida:'insetos',qtd:2,preco:3500,atr:6,social:1,mat:30,gest:14,ninhada:3,vida:300,fert:.06,pred:true,nada:false,vel:.9,stage:2,
    vis:{tipo:'reptil',L:26,Wd:7,cor:'#7a6a3a',cor2:'#c9a84a',cab:3,focinho:5,cauda:14}},
  /* ---- Ásia ---- */
  pavao:{nome:'Pavão',plural:'pavões',bioma:'asia',terr:{grama:1,floresta:.8},fol:.08,plantas:['tropical','bambu','samambaia'],agua:.02,abrigo:false,enriq:null,esp:2,comida:'sementes',qtd:1,preco:3000,atr:8,social:2,mat:20,gest:8,ninhada:3,vida:200,fert:.10,pred:false,nada:false,vel:1.3,stage:3,
    vis:{tipo:'ave',L:14,Wd:8,cor:'#1f5fb8',cor2:'#2aa0a0',bico:'#555',bicoL:2,cab:3,asas:'#7a5a2a',cauda:'#2e8a4a',leque:'#3fbf9f'}},
  macaco_japones:{nome:'Macaco-japonês',plural:'macacos-japoneses',bioma:'asia',terr:{floresta:1,pedra:.8,neve:.7},fol:.15,plantas:['bambu','tropical','samambaia'],agua:.15,abrigo:false,enriq:'escalada',esp:3,comida:'frutas',qtd:2,preco:6000,atr:8,social:4,mat:30,gest:14,ninhada:1,vida:260,fert:.08,pred:false,nada:true,vel:1.5,stage:3,
    vis:{tipo:'primata',L:13,Wd:10,cor:'#a89a88',cor2:'#e07a7a',cab:4,bracos:10}},
  panda:{nome:'Panda-gigante',plural:'pandas-gigantes',bioma:'asia',terr:{floresta:1,grama:.6,pedra:.5},fol:.3,plantas:['bambu','samambaia'],agua:.03,abrigo:true,enriq:'escalada',esp:14,comida:'feno',qtd:10,preco:45000,atr:16,social:1,mat:50,gest:22,ninhada:1,vida:350,fert:.04,pred:false,nada:false,vel:.8,stage:4,
    vis:{tipo:'quad',L:26,Wd:16,cor:'#f5f3ee',cor2:'#1a1a1a',padrao:'panda',cab:7,cauda:2,orelhas:2.6,orelhasCor:'#1a1a1a',mascara:'#1a1a1a'}},
  elefante_asiatico:{nome:'Elefante-asiático',plural:'elefantes-asiáticos',bioma:'asia',terr:{floresta:1,grama:.8,lama:.7},fol:.1,plantas:['bambu','tropical'],agua:.1,abrigo:false,enriq:null,esp:20,comida:'feno',qtd:28,preco:26000,atr:12,social:2,mat:60,gest:30,ninhada:1,vida:420,fert:.05,pred:false,nada:true,vel:1.0,stage:4,
    vis:{tipo:'elefante',L:38,Wd:23,cor:'#7a7470',cor2:'#5e5854',cab:9.5,cauda:6}},
  leopardo_neves:{nome:'Leopardo-das-neves',plural:'leopardos-das-neves',bioma:'asia',terr:{pedra:1,neve:.9,floresta:.5},fol:.03,plantas:['pinheiro','samambaia'],agua:.03,abrigo:true,enriq:'escalada',esp:12,comida:'carne',qtd:5,preco:30000,atr:13,social:1,mat:35,gest:14,ninhada:2,vida:260,fert:.06,pred:true,nada:false,vel:1.7,stage:4,
    vis:{tipo:'quad',L:26,Wd:10,cor:'#dcdad2',cor2:'#5a5a5a',padrao:'rosetas',cab:5,cauda:15,caudaPeluda:true}},
  komodo:{nome:'Dragão-de-komodo',plural:'dragões-de-komodo',bioma:'asia',terr:{areia:1,pedra:.8,floresta:.7},fol:.04,plantas:['tropical','samambaia'],agua:.05,abrigo:true,enriq:null,esp:12,comida:'carne',qtd:4,preco:35000,atr:13,social:1,mat:50,gest:25,ninhada:3,vida:450,fert:.04,pred:true,nada:true,vel:.8,stage:4,
    vis:{tipo:'reptil',L:40,Wd:10,cor:'#6a6a50',cor2:'#4a4a38',cab:4.5,focinho:7,cauda:18}},
  /* ---- Polar ---- */
  foca:{nome:'Foca',plural:'focas',bioma:'polar',terr:{gelo:1,neve:.9,pedra:.6},fol:0,plantas:[],agua:.45,abrigo:false,enriq:'gelo_bloco',esp:4,comida:'peixe',qtd:3,preco:6000,atr:9,social:3,mat:25,gest:12,ninhada:1,vida:250,fert:.08,pred:false,nada:true,vel:.9,stage:4,
    vis:{tipo:'foca',L:22,Wd:10,cor:'#7d8a92',cor2:'#5a666e',cab:4}},
  morsa:{nome:'Morsa',plural:'morsas',bioma:'polar',terr:{gelo:1,pedra:.8,neve:.7},fol:0,plantas:[],agua:.4,abrigo:false,enriq:'gelo_bloco',esp:14,comida:'peixe',qtd:10,preco:20000,atr:11,social:2,mat:45,gest:22,ninhada:1,vida:380,fert:.05,pred:false,nada:true,vel:.6,stage:4,
    vis:{tipo:'foca',L:36,Wd:18,cor:'#a8765a',cab:6,presas:'#f4efe0'}},
  rena:{nome:'Rena',plural:'renas',bioma:'polar',terr:{neve:1,pedra:.7,grama:.5},fol:.03,plantas:['pinheiro'],agua:.03,abrigo:false,enriq:null,esp:8,comida:'feno',qtd:8,preco:8000,atr:8,social:3,mat:28,gest:16,ninhada:1,vida:240,fert:.08,pred:false,nada:true,vel:1.5,stage:4,
    vis:{tipo:'quad',L:28,Wd:12,cor:'#8a7660',cor2:'#e8e0d0',padrao:'peito',cab:5,cauda:3,galhada:'#d8c8a8',galhadaAmbos:true}},
  lobo_artico:{nome:'Lobo-ártico',plural:'lobos-árticos',bioma:'polar',terr:{neve:1,pedra:.8,gelo:.6},fol:.02,plantas:['pinheiro'],agua:.03,abrigo:true,enriq:null,esp:8,comida:'carne',qtd:4,preco:12000,atr:10,social:3,mat:24,gest:10,ninhada:3,vida:200,fert:.08,pred:true,nada:false,vel:1.9,stage:4,
    vis:{tipo:'quad',L:24,Wd:9,cor:'#eeeeea',cor2:'#cfd2d4',padrao:'nenhum',cab:5,focinho:3,cauda:10,caudaPeluda:true,orelhas:2.5}},
  coruja_neves:{nome:'Coruja-das-neves',plural:'corujas-das-neves',bioma:'polar',terr:{neve:1,pedra:.8},fol:.02,plantas:['pinheiro'],agua:.01,abrigo:false,enriq:null,esp:3,comida:'carne',qtd:.8,preco:5000,atr:8,social:1,mat:20,gest:9,ninhada:3,vida:220,fert:.08,pred:true,nada:false,voa:true,vel:1.8,stage:4,
    vis:{tipo:'ave',L:11,Wd:9,cor:'#f6f6f2',cor2:'#3a3a3a',bico:'#2a2a2a',bicoL:2,cab:4,asas:'#ecece6',cauda:'#ecece6'}},
  /* ---- Fantástico ---- */
  pegaso:{nome:'Pégaso',plural:'pégasos',bioma:'fantastico',terr:{mistico:1,grama:.8,pedra:.6},fol:.08,plantas:['arvore_mistica','cristal'],agua:.04,abrigo:false,enriq:null,esp:12,comida:'essencia',qtd:2,preco:75000,atr:21,social:2,mat:50,gest:24,ninhada:1,vida:1000,fert:.04,pred:false,nada:false,voa:true,vel:1.9,stage:5,
    vis:{tipo:'quad',L:30,Wd:12,cor:'#ffffff',cor2:'#e8eef8',padrao:'nenhum',cab:6,cauda:11,caudaPeluda:true,crina:'#9fd4ff',asas:'#eaf2ff'}},
  kirin:{nome:'Kirin',plural:'kirins',bioma:'fantastico',terr:{mistico:1,grama:.7},fol:.08,plantas:['arvore_mistica','cristal','bambu'],agua:.05,abrigo:false,enriq:'cristal',esp:12,comida:'essencia',qtd:2,preco:85000,atr:22,social:1,mat:55,gest:25,ninhada:1,vida:1500,fert:.03,pred:false,nada:false,vel:1.7,stage:5,
    vis:{tipo:'quad',L:30,Wd:12,cor:'#e8c86a',cor2:'#4a9a9a',padrao:'manchas',cab:6,cauda:10,caudaPeluda:true,crina:'#ff7a3a',galhada:'#f7d774',galhadaAmbos:true}},
  basilisco:{nome:'Basilisco',plural:'basiliscos',bioma:'fantastico',terr:{mistico:1,pedra:1,lama:.6},fol:.03,plantas:['cristal','arvore_mistica'],agua:.08,abrigo:true,enriq:'cristal',esp:16,comida:'carne',qtd:8,preco:70000,atr:19,social:1,mat:60,gest:28,ninhada:2,vida:1800,fert:.03,pred:true,nada:true,vel:.9,stage:5,
    vis:{tipo:'cobra',L:52,Wd:8,cor:'#2e6b3a',cor2:'#e8c84a',cab:5,cauda:0}}
};
Object.keys(FP.SPECIES).forEach(k => FP.SPECIES[k].id = k);

/* ---------------- Vegetação e decoração ----------------
 planta: conta como vegetação  abrigo/agua/enriq: função para animais
 bloqueia: animais desviam  copa: desenhada acima dos animais  beleza: bônus visual */
FP.DECOS = {
  arbusto:     {nome:'Arbusto',            custo:40,  planta:true, biomas:['savana','brasil','pantanal','asia','deserto'], beleza:2, copa:false, bloqueia:false},
  capim:       {nome:'Capim alto',         custo:20,  planta:true, biomas:['savana'], beleza:1, copa:false, bloqueia:false},
  acacia:      {nome:'Acácia',             custo:120, planta:true, biomas:['savana'], beleza:4, copa:true,  bloqueia:true},
  baoba:       {nome:'Baobá',              custo:260, planta:true, biomas:['savana'], beleza:6, copa:true,  bloqueia:true},
  tropical:    {nome:'Árvore tropical',    custo:140, planta:true, biomas:['brasil','asia','pantanal'], beleza:4, copa:true, bloqueia:true},
  palmeira:    {nome:'Palmeira',           custo:110, planta:true, biomas:['brasil','pantanal','deserto'], beleza:4, copa:true, bloqueia:true},
  ipe:         {nome:'Ipê-amarelo',        custo:160, planta:true, biomas:['brasil'], beleza:6, copa:true, bloqueia:true},
  bromelia:    {nome:'Bromélias',          custo:50,  planta:true, biomas:['brasil'], beleza:3, copa:false, bloqueia:false},
  mangue:      {nome:'Mangue',             custo:120, planta:true, biomas:['pantanal'], beleza:4, copa:true, bloqueia:true, stage:2},
  aguape:      {nome:'Aguapés',            custo:40,  planta:true, biomas:['pantanal'], beleza:3, copa:false, bloqueia:false, naAgua:true, stage:2},
  cacto:       {nome:'Cacto',              custo:60,  planta:true, biomas:['deserto'], beleza:3, copa:false, bloqueia:true, stage:2},
  arbusto_seco:{nome:'Arbusto seco',       custo:30,  planta:true, biomas:['deserto'], beleza:1, copa:false, bloqueia:false, stage:2},
  bambu:       {nome:'Bambuzal',           custo:90,  planta:true, biomas:['asia'], beleza:4, copa:true, bloqueia:true, stage:3},
  samambaia:   {nome:'Samambaia',          custo:45,  planta:true, biomas:['asia','brasil'], beleza:3, copa:false, bloqueia:false, stage:3},
  pinheiro:    {nome:'Pinheiro nevado',    custo:130, planta:true, biomas:['polar'], beleza:4, copa:true, bloqueia:true, stage:4},
  arvore_mistica:{nome:'Árvore mística',   custo:600, planta:true, biomas:['fantastico'], beleza:10, copa:true, bloqueia:true, stage:5},
  cristal:     {nome:'Cristal arcano',     custo:500, planta:true, biomas:['fantastico'], beleza:8, copa:false, bloqueia:true, stage:5, enriq:true},
  flores:      {nome:'Canteiro de flores', custo:35,  planta:false, biomas:[], beleza:4, copa:false, bloqueia:false},
  pedra:       {nome:'Pedra',              custo:50,  planta:false, biomas:[], beleza:2, copa:false, bloqueia:true},
  tronco:      {nome:'Tronco caído',       custo:45,  planta:false, biomas:[], beleza:2, copa:false, bloqueia:true},
  abrigo:      {nome:'Abrigo para animais',custo:600, planta:false, biomas:[], beleza:1, copa:false, bloqueia:true, abrigo:true},
  bebedouro:   {nome:'Bebedouro animal',   custo:250, planta:false, biomas:[], beleza:0, copa:false, bloqueia:true, agua:true},
  escalada:    {nome:'Estrutura de escalada', custo:450, planta:false, biomas:[], beleza:1, copa:false, bloqueia:true, enriq:true},
  cupinzeiro:  {nome:'Cupinzeiro',         custo:120, planta:false, biomas:[], beleza:1, copa:false, bloqueia:true, enriq:true},
  gelo_bloco:  {nome:'Bloco de gelo',      custo:200, planta:false, biomas:[], beleza:2, copa:false, bloqueia:true, enriq:true, stage:4},
  estatua:     {nome:'Estátua de animal',  custo:900, planta:false, biomas:[], beleza:12, copa:false, bloqueia:true, foraRecinto:true},
  fonte:       {nome:'Chafariz',           custo:1500,planta:false, biomas:[], beleza:16, copa:false, bloqueia:true, foraRecinto:true, stage:2},
  /* v2.0: postes e placas ficam na BORDA do caminho (naBorda) e não bloqueiam a passagem */
  poste:       {nome:'Poste de luz',       custo:120, planta:false, biomas:[], beleza:2, copa:false, bloqueia:false, foraRecinto:true, luz:true, naBorda:true, alcance:4},
  poste_duplo: {nome:'Poste duplo (praça)',custo:260, planta:false, biomas:[], beleza:4, copa:false, bloqueia:false, foraRecinto:true, luz:true, naBorda:true, alcance:6, stage:2},
  luminaria:   {nome:'Luminária de jardim',custo:60,  planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, luz:true, alcance:2},
  holofote:    {nome:'Holofote do recinto',custo:220, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, luz:true, alcance:5, soRecinto:true, stage:2},
  placa:       {nome:'Placa educativa',    custo:150, planta:false, biomas:[], beleza:2, copa:false, bloqueia:false, foraRecinto:true, educa:true, naBorda:true},
  /* v7.1: BRINQUEDOS para os animais (dentro dos recintos). gosto: grupos de espécies que adoram o brinquedo */
  bola:          {nome:'Bola de enriquecimento', custo:80,  planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['quad','elefante','primata','foca']},
  caixa_petiscos:{nome:'Caixa de petiscos',      custo:90,  planta:false, biomas:[], beleza:0, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['todos']},
  pneu:          {nome:'Pneu suspenso',          custo:150, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['primata','predador']},
  arranhador:    {nome:'Tronco arranhador',      custo:140, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['predador']},
  escova:        {nome:'Escova de coçar',        custo:180, planta:false, biomas:[], beleza:0, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['herbivoro','elefante']},
  quebra_cabeca: {nome:'Comedouro quebra-cabeça',custo:220, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['primata','predador','elefante','grande']},
  rede_cordas:   {nome:'Rede de cordas',         custo:280, planta:false, biomas:[], beleza:2, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['primata','escalador']},
  poleiro:       {nome:'Poleiro com balanço',    custo:120, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, gosto:['ave']},
  boia:          {nome:'Boia flutuante',         custo:110, planta:false, biomas:[], beleza:1, copa:false, bloqueia:false, soRecinto:true, brinquedo:true, naAgua:true, gosto:['nadador']}
};
/* Grupos de gosto de uma espécie (para os brinquedos) */
FP.toyTags = function(spId){
  const sp = FP.SPECIES[spId], v = sp.vis, t = new Set(['todos', v.tipo]);
  if (sp.pred) t.add('predador'); else t.add('herbivoro');
  if (sp.nada) t.add('nadador');
  if (sp.voa || v.tipo === 'ave') t.add('ave');
  if (v.L >= 30) t.add('grande');
  if (sp.enriq === 'escalada') t.add('escalador');
  if (v.tipo === 'pinguim') t.add('nadador');
  return t;
};
FP.toyLiked = (toyType, spId) => { const d = FP.DECOS[toyType]; if (!d || !d.brinquedo) return false; const t = FP.toyTags(spId); return d.gosto.some(g => t.has(g)); };

/* ---------------- Instalações ----------------
 tipo: 'visitante' | 'operacional'   w,h: tamanho   manut: custo diário
 atende: necessidade do visitante   venda: preço médio por uso */
FP.BUILDINGS = {
  entrada:    {nome:'Entrada e bilheteria', w:4, h:2, custo:0,     manut:20, tipo:'fixo', cor:'#1F6B4A', icone:'🎟️'},
  lanchonete: {nome:'Lanchonete',           w:2, h:2, custo:3500,  manut:35, tipo:'visitante', atende:'fome', venda:14, custoVenda:5, cor:'#E8574B', icone:'🍔', desc:'Sacia a fome dos visitantes. Receita por venda.'},
  bebidas:    {nome:'Quiosque de bebidas',  w:1, h:1, custo:1200,  manut:12, tipo:'visitante', atende:'sede', venda:6, custoVenda:2, cor:'#2E8FB8', icone:'🥤', desc:'Mata a sede. Pequeno e barato.'},
  sorvete:    {nome:'Sorveteria',           w:1, h:1, custo:1600,  manut:14, tipo:'visitante', atende:'sede', venda:9, custoVenda:3, cor:'#f49ac1', icone:'🍦', desc:'Bebidas geladas e sorvetes.', stage:2},
  restaurante:{nome:'Restaurante',          w:3, h:3, custo:12000, manut:90, tipo:'visitante', atende:'fome', venda:32, custoVenda:12, cor:'#C8553D', icone:'🍽️', desc:'Refeições completas, alta satisfação.', stage:2, bonus:6},
  banheiro:   {nome:'Banheiros',            w:2, h:2, custo:2500,  manut:25, tipo:'visitante', atende:'banheiro', venda:0, cor:'#7FC8E8', icone:'🚻', desc:'Indispensável para o conforto dos visitantes.'},
  banco:      {nome:'Banco',                w:1, h:1, custo:150,   manut:1,  tipo:'visitante', atende:'energia', venda:0, cor:'#8a5a2b', icone:'🪑', desc:'Descanso. Coloque ao lado do caminho.'},
  lixeira:    {nome:'Lixeira',              w:1, h:1, custo:100,   manut:2,  tipo:'visitante', atende:null, venda:0, cor:'#4a5a4a', icone:'🗑️', desc:'Reduz o lixo jogado no chão num raio de 6 tiles.'},
  loja:       {nome:'Loja de lembranças',   w:2, h:2, custo:6000,  manut:45, tipo:'visitante', atende:'compras', venda:28, custoVenda:11, cor:'#F2B33D', icone:'🎁', desc:'Pelúcias, camisetas e lembranças.'},
  info:       {nome:'Ponto de informação',  w:1, h:1, custo:900,   manut:10, tipo:'visitante', atende:null, venda:0, cor:'#1F6B4A', icone:'ℹ️', desc:'Mapas e orientação: +satisfação ao circular.', bonus:2},
  estacionamento:{nome:'Estacionamento',    w:4, h:3, custo:8000,  manut:30, tipo:'visitante', atende:null, venda:10, cor:'#5b6670', icone:'🅿️', desc:'R$ 10 por carro. 35% dos visitantes vêm de carro. 80 vagas/dia.', stage:2, foraCaminhoOk:true},
  deposito:   {nome:'Depósito de alimentos',w:2, h:2, custo:4000,  manut:20, tipo:'operacional', cor:'#7a5c3e', icone:'📦', desc:'+800 unidades de capacidade de estoque.', stage:1},
  clinica:    {nome:'Clínica veterinária',  w:3, h:2, custo:15000, manut:80, tipo:'operacional', cor:'#ffffff', icone:'🏥', desc:'Permite diagnóstico, tratamento e quarentena (6 vagas).', stage:3},
  sala_func:  {nome:'Sala dos funcionários',w:2, h:2, custo:5000,  manut:30, tipo:'operacional', cor:'#9aa5b1', icone:'☕', desc:'+10% de eficiência da equipe (máx. 2).', stage:2},
  centro_pesq:{nome:'Centro de conservação',w:3, h:3, custo:40000, manut:150,tipo:'operacional', cor:'#2E8FB8', icone:'🔬', desc:'Programas de conservação: +reputação diária e +10% reprodução.', stage:4}
};

/* ---------------- Funcionários ---------------- */
FP.STAFF = {
  tratador:     {nome:'Tratador(a)',           salario:60,  cap:14,  unid:'animais',   icone:'🧑‍🌾', cor:'#2f7d32', stage:1, desc:'Alimenta os animais (7h e 15h) e observa comportamentos.'},
  limpeza:      {nome:'Auxiliar de limpeza',   salario:45,  cap:12,  unid:'pontos/h',  icone:'🧹', cor:'#2E8FB8', stage:1, desc:'Limpa recintos e recolhe o lixo dos caminhos.'},
  biologo:      {nome:'Biólogo(a)',            salario:110, cap:40,  unid:'animais',   icone:'🧑‍🔬', cor:'#7b4fb8', stage:2, desc:'Acompanha espécies: +reprodução, +bem-estar e previsão de nascimentos.'},
  administrador:{nome:'Administrador(a)',      salario:120, cap:1,   unid:'',          icone:'💼', cor:'#5b6670', stage:2, desc:'-4% em todas as despesas operacionais (máx. 3).'},
  veterinario:  {nome:'Veterinário(a)',        salario:140, cap:3,   unid:'pacientes', icone:'🩺', cor:'#E8574B', stage:3, desc:'Diagnostica e trata doenças. Exige clínica.'},
  guia:         {nome:'Guia de passeios',      salario:70,  cap:120, unid:'visitantes',icone:'🧭', cor:'#F2B33D', stage:4, desc:'Passeios guiados: +R$ 4 por visitante atendido e +satisfação.'}
};

/* ---------------- Doenças ---------------- */
FP.DISEASES = {
  parasitose:  {nome:'Parasitose',             sev:0.25, contagio:0.10, dias:3, custo:60,  sintoma:'está coçando muito e perdeu apetite'},
  respiratoria:{nome:'Infecção respiratória',  sev:0.45, contagio:0.18, dias:4, custo:120, sintoma:'está tossindo e respirando com dificuldade'},
  gripe_aviaria:{nome:'Gripe aviária',         sev:0.7, contagio:0.30, dias:5, custo:180, sintoma:'está apática e com as penas eriçadas', aves:true},
  desnutricao: {nome:'Desnutrição',            sev:0.4, contagio:0,    dias:3, custo:70,  sintoma:'está muito magro e fraco'},
  estresse:    {nome:'Estresse crônico',       sev:0.2, contagio:0,    dias:3, custo:50,  sintoma:'anda em círculos e está agitado'}
};

/* ---------------- Etapas de progressão ---------------- */
FP.STAGES = [
  null,
  {n:1, nome:'Pequeno zoológico', desc:'Terreno limitado, poucas espécies e operação simplificada.', req:null},
  {n:2, nome:'Expansão', desc:'Novos biomas (Pantanal e Deserto), mais espécies, restaurantes e biólogos.',
    req:{rep:25, especies:4, visitantesTotal:400}, premio:15000},
  {n:3, nome:'Gestão completa', desc:'Ásia, clínica veterinária, veterinários, doenças e quarentena.',
    req:{rep:42, especies:8, animais:30}, premio:30000},
  {n:4, nome:'Grande zoológico', desc:'Região polar, espécies raras, guias, eventos e conservação.',
    req:{rep:60, especies:14, satisfacao:62, lotes:13}, premio:60000},
  {n:5, nome:'Conteúdo fantástico', desc:'Área mística com unicórnios, grifos, fênix e dragões.',
    req:{rep:78, especies:20, bemEstar:70, dinheiro:250000}, premio:120000}
];

/* ---------------- Eventos temáticos ---------------- */
FP.EVENTS = {
  noite:   {nome:'Noite no Zoológico', custo:6000, dias:3, demanda:0.45, rep:2, icone:'🌙'},
  felinos: {nome:'Semana dos Felinos', custo:5000, dias:5, demanda:0.30, rep:2, icone:'🐆', exige:['leao','onca','tigre','guepardo','caracal','leopardo_neves']},
  aves:    {nome:'Festival de Aves',   custo:4000, dias:4, demanda:0.30, rep:2, icone:'🦜', exige:['tucano','arara','tuiuiu','avestruz','pinguim','arara_azul','flamingo','pavao','ema','harpia','coruja_neves']},
  escolas: {nome:'Semana Escolar',     custo:3000, dias:5, demanda:0.25, rep:3, icone:'🎒'}
};

/* ---------------- Nomes ---------------- */
FP.NAMES_M = ['Tião','Bento','Juca','Zeca','Caju','Nino','Pipoca','Rui','Theo','Dudu','Lino','Benjamin','Otto','Pingo','Simba','Tufão','Bartô','Chico','Fredo','Gael','Hugo','Ivo','Joca','Kiko','Léo','Miguel','Nando','Orlando','Paçoca','Quim','Rambo','Sansão','Tito','Ubiratã','Vito','Xodó','Yuri','Zion','Apolo','Brutus','Cacau','Duque'];
FP.NAMES_F = ['Mel','Nina','Lua','Jade','Cora','Bela','Dalila','Estrela','Flor','Gaia','Iara','Jurema','Kiara','Lola','Maya','Nala','Olívia','Pérola','Quitéria','Rosa','Sofia','Tainá','Uma','Vitória','Xica','Yara','Zuri','Amora','Bibi','Canela','Duda','Elis','Fiona','Gabi','Hanna','Íris','Jabu','Luna','Mia','Nanda'];
FP.STAFF_NAMES = ['Ana','Bruno','Carla','Diego','Elaine','Fábio','Gisele','Henrique','Isabel','João','Karina','Lucas','Marina','Nelson','Otávia','Paulo','Raquel','Sérgio','Tânia','Ulisses','Vera','Wagner','Yasmin','Zélia','Rafael','Bianca','Caio','Débora','Eduardo','Fernanda'];
