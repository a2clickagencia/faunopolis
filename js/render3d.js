/* =========================================================
   FAUNÓPOLIS — render3d.js  (v7.1)
   Visão 3D completa em ALTA QUALIDADE (Three.js):
   - Renderização física (PBR), tone mapping ACES, sRGB,
     céu procedural com nuvens, sol e estrelas, reflexos do
     céu (environment map) e sombras suaves.
   - Terreno contínuo com relevo suave, margens e lagos
     escavados, transição suave entre biomas; água refletiva
     animada; grama instanciada balançando ao vento;
     caminhos em pavimento com meio-fio.
   - Modelos orgânicos de models3d.js (animais esculpidos com
     membros animados, vegetação, brinquedos, instalações).
   - Câmeras: Isométrica 3D (Q/E), Órbita livre, Seguir animal,
     Olhar do visitante (1ª pessoa) e Tour.
   1 unidade = 1 tile; X = x do mapa, Z = y do mapa, Y = altura.
   ========================================================= */
'use strict';
(function(){
const R3 = FP.R3 = {active: false, mode: 'iso', ok: false};
const U = FP.U, T = FP.TILE;
let M3, col, lerpC, mulC;
let renderer, scene, camera, canvas, sun, hemi, pmrem;
let W = 0, H = 0, clock = 0;

/* ---------------- Câmera ---------------- */
const C = {tx: FP.OX + 36, ty: FP.OY + 32, yaw: Math.PI / 4, pitch: .82, dist: 34, fov: 30,
           yawT: Math.PI / 4, pitchT: .82, distT: 34, fovT: 30, syncX: 0, syncY: 0};
const MODES = {
  iso:       {nome: 'Isométrica 3D', fov: 30, pitch: .82},
  livre:     {nome: 'Órbita livre 3D', fov: 50, pitch: .62},
  seguir:    {nome: 'Seguir animal', fov: 50, pitch: .42},
  visitante: {nome: 'Olhar do visitante', fov: 72, pitch: .1},
  tour:      {nome: 'Tour cinematográfico', fov: 45, pitch: .5}
};
R3.MODES = MODES;
let follow = {animal: null, visitor: null, tourI: 0, tourT: 0, look: null};

/* ---------------- Materiais ---------------- */
let matStd, matAnimal, matTerrain, matPath, matRoad, matWater, matWin, matGlow, matPool, matOverlay, matGrass, matLine, matPeople, matFence, matPost, matCurb, matHalo;
const uTime = {value: 0};

/* ---------------- Inicialização ---------------- */
R3.available = () => !!window.THREE;
R3._dbg = () => ({scene, camera, renderer, sun, skyUni, terrainGeo});
/* v7.2: qualidade gráfica (alta no PC; média/baixa automática em celular e tablet) */
/* sub: subdivisões do terreno · env: reflexos do céu (PMREM) · view: alcance da visão
   detail: detalhe dos animais esculpidos · people: pessoas desenhadas · halos: brilhos noturnos */
const QUAL = {
  alta:   {nome: 'Alta',   pr: 1.75, shadows: true,  shadow: 4096, soft: true,  grass: 1,   aa: true,  sub: 2, env: true,  view: 1,   detail: 1,   people: 1700, halos: 400},
  media:  {nome: 'Média',  pr: 1.25, shadows: true,  shadow: 2048, soft: false, grass: .4,  aa: true,  sub: 2, env: true,  view: .8,  detail: .8,  people: 600,  halos: 120},
  baixa:  {nome: 'Baixa',  pr: 1,    shadows: false, shadow: 1024, soft: false, grass: 0,   aa: false, sub: 1, env: false, view: .55, detail: .5,  people: 250,  halos: 0},
  minima: {nome: 'Mínima', pr: .75,  shadows: false, shadow: 512,  soft: false, grass: 0,   aa: false, sub: 1, env: false, view: .4,  detail: .42, people: 120,  halos: 0}
};
R3.QUAL = QUAL;
R3.autoQuality = function(){
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  if (!coarse) return 'alta';
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const big = Math.min(screen.width, screen.height) >= 700;
  if (big && mem >= 6 && cores >= 8) return 'media';
  // iPhone/iPad não informam a memória e limitam os núcleos informados: começam na baixa
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)) return 'baixa';
  return mem <= 3 || cores <= 4 ? 'minima' : 'baixa';
};
R3.qualitySetting = function(){ try { return localStorage.getItem('faunopolis_qualidade') || 'auto'; } catch (e){ return 'auto'; } };
let qLevel = null;
function Q(){ if (!qLevel){ const s = R3.qualitySetting(); qLevel = QUAL[s] ? s : R3.autoQuality(); } return QUAL[qLevel]; }
R3.qualityLevel = () => (Q(), qLevel);
R3.modelDetail = () => Q().detail;
R3.setQuality = function(setting, quiet){
  try { localStorage.setItem('faunopolis_qualidade', setting); } catch (e){}
  applyLevel(QUAL[setting] ? setting : R3.autoQuality(), quiet);
};
function applyLevel(level, quiet){
  const old = qLevel; qLevel = level;
  if (!R3.ok || old === level) return;
  const q = QUAL[level];
  renderer.shadowMap.enabled = q.shadows; sun.castShadow = q.shadows;
  renderer.shadowMap.type = q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  if (!q.env && envRT){ scene.environment = null; envRT.dispose(); envRT = null; }
  envHour = -99; applied.ok = false; halosApplied = -1;
  if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  grassSig = ''; resize();
  if (!quiet) FP.UI.toast('Gráficos 3D: qualidade ' + q.nome.toLowerCase() + '.');
}
// no modo automático, se o aparelho não aguentar (menos de ~22 quadros/s), baixa a qualidade sozinho
const perf = {t: 0, n: 0, warmup: 3};
function perfSample(dt){
  if (R3.qualitySetting() !== 'auto' || document.hidden) return;
  if (perf.warmup > 0){ perf.warmup -= dt; return; }
  perf.t += dt; perf.n++;
  if (perf.t < 5) return;
  const fps = perf.n / perf.t; perf.t = 0; perf.n = 0;
  const ORDER = ['alta', 'media', 'baixa', 'minima'];
  if (fps < 24 && qLevel !== 'minima'){ applyLevel(ORDER[ORDER.indexOf(qLevel) + 1], true); perf.warmup = 3; FP.UI.toast('O 3D estava lento: qualidade gráfica reduzida automaticamente.', 'info'); }
  else if (fps < 15 && qLevel === 'minima' && !perf.warned){ perf.warned = true; FP.UI.toast('Dica: se o 3D estiver lento, toque em 🗺️ e use a visão 2D, que é bem mais leve.', 'info'); }
}
/* Material: PBR (MeshStandard) nas qualidades alta/média; nas baixas, iluminação por vértice
   (MeshLambert), muito mais leve para a placa de vídeo do celular. Escolhido ao iniciar o 3D. */
let lowMat = false;
const PBR_ONLY = ['roughness', 'metalness', 'envMapIntensity', 'normalMap', 'normalScale', 'roughnessMap', 'metalnessMap'];
function PBR(p){
  if (!lowMat) return new THREE.MeshStandardMaterial(p);
  const q = Object.assign({}, p); PBR_ONLY.forEach(k => delete q[k]);
  return new THREE.MeshLambertMaterial(q);
}
function init(){
  if (R3.ok) return true;
  lowMat = !Q().env;
  if (!window.THREE){ FP.UI.toast('Biblioteca 3D (js/lib/three.min.js) não encontrada.', 'error'); return false; }
  M3 = FP.M3; col = M3.col; lerpC = M3.lerpC; mulC = M3.mulC;
  canvas = document.getElementById('game3d');
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: Q().aa, powerPreference: 'high-performance'});
  } catch (e){ FP.UI.toast('Seu navegador não suporta WebGL: o modo 3D está indisponível.', 'error'); return false; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.shadowMap.enabled = Q().shadows;
  renderer.shadowMap.type = Q().soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, .1, 1200);
  hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a5a3a, .35); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = Q().shadows;
  sun.shadow.mapSize.set(Q().shadow, Q().shadow);
  sun.shadow.bias = -.00025; sun.shadow.normalBias = .025;
  scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xbfdcf0, 120, 420);
  pmrem = new THREE.PMREMGenerator(renderer);

  matStd = PBR({vertexColors: true, roughness: .82, metalness: 0, envMapIntensity: .7});
  matAnimal = PBR({vertexColors: true, roughness: .66, metalness: 0, envMapIntensity: .8});
  matPeople = PBR({color: 0xffffff, roughness: .7, envMapIntensity: .7});
  matWin = PBR({color: 0x9fcde8, roughness: .08, metalness: .3, emissive: 0x000000, envMapIntensity: 1.4});
  matGlow = new THREE.MeshBasicMaterial({color: 0xfff1b0, toneMapped: false});
  matLine = new THREE.MeshBasicMaterial({color: 0xfff4de, transparent: true, opacity: .55});
  matFence = PBR({color: col('#9a6c42'), roughness: .9, map: woodTex()});
  matPost = PBR({color: col('#6a4a2c'), roughness: .9, map: woodTex()});
  matCurb = PBR({color: col('#c9c2b0'), roughness: .85});
  // poças de luz no chão (noite)
  const pc = document.createElement('canvas'); pc.width = pc.height = 128;
  const pg = pc.getContext('2d'); const gr = pg.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,214,140,1)'); gr.addColorStop(.45, 'rgba(255,190,110,.42)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
  pg.fillStyle = gr; pg.fillRect(0, 0, 128, 128);
  const poolTex = new THREE.CanvasTexture(pc);
  matPool = new THREE.MeshBasicMaterial({map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false});
  matHalo = new THREE.SpriteMaterial({map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false});
  buildSky();
  buildStatic();
  R3.ok = true;
  resize();
  window.addEventListener('resize', resize);
  return true;
}
function resize(){
  if (!renderer) return;
  W = window.innerWidth; H = window.innerHeight;
  renderer.setPixelRatio(Math.min(Q().pr, window.devicePixelRatio || 1));
  renderer.setSize(W, H, false);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  camera.aspect = W / H; camera.updateProjectionMatrix();
}

/* ---------------- Texturas procedurais ---------------- */
function canvasTex(size, draw, srgb, repeat){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}
/* mapa de normais a partir de um mapa de altura (canvas em tons de cinza) */
function normalFromHeight(hc, strength){
  const s = hc.width, g = hc.getContext('2d'), src = g.getImageData(0, 0, s, s).data;
  const out = document.createElement('canvas'); out.width = out.height = s;
  const og = out.getContext('2d'), img = og.createImageData(s, s), d = img.data;
  const hgt = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++){
    const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * strength, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), k = (y * s + x) * 4;
    d[k] = (-dx / l * .5 + .5) * 255; d[k + 1] = (dy / l * .5 + .5) * 255; d[k + 2] = (1 / l * .5 + .5) * 255; d[k + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function noiseCanvas(size, scale, oct, seed){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  // ruído periódico (tileável)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++){
    const a = x / size * Math.PI * 2, b = y / size * Math.PI * 2;
    const v = M3.fbm(Math.cos(a) * scale + seed, Math.sin(a) * scale, Math.cos(b) * scale + Math.sin(b) * scale * .7 + seed * .3, oct);
    const k = (y * size + x) * 4; d[k] = d[k + 1] = d[k + 2] = Math.max(0, Math.min(255, v * 255)); d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
let _wood;
function woodTex(){
  if (_wood) return _wood;
  _wood = canvasTex(128, (g, s) => {
    g.fillStyle = '#c8a27a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++){ g.strokeStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 25},${30},${.12 + Math.random() * .2})`; g.lineWidth = .5 + Math.random() * 2; const y = Math.random() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * .3, y + Math.random() * 6 - 3, s * .6, y + Math.random() * 6 - 3, s, y); g.stroke(); }
  }, true, true);
  return _wood;
}
function paverTextures(){
  // pavimento intertravado (1 tile = 1 repetição)
  const S = 512, rnd = U.rng(77);
  const hc = document.createElement('canvas'); hc.width = hc.height = S; const hg = hc.getContext('2d');
  const cc = document.createElement('canvas'); cc.width = cc.height = S; const cg = cc.getContext('2d');
  cg.fillStyle = '#9d907a'; cg.fillRect(0, 0, S, S); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const bw = S / 4, bh = S / 8;
  for (let row = 0; row < 8; row++) for (let i = -1; i < 5; i++){
    const x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    const tone = rnd();
    const base = [[226, 209, 172], [214, 196, 158], [232, 218, 186], [205, 186, 150]][Math.floor(tone * 4)];
    const j = (rnd() - .5) * 14;
    cg.fillStyle = `rgb(${base[0] + j},${base[1] + j},${base[2] + j})`;
    cg.beginPath(); cg.roundRect(x + 3, y + 3, bw - 6, bh - 6, 7); cg.fill();
    // granulação
    for (let k = 0; k < 40; k++){ cg.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '80,60,40'},${rnd() * .08})`; cg.fillRect(x + 4 + rnd() * (bw - 8), y + 4 + rnd() * (bh - 8), 2 + rnd() * 3, 2 + rnd() * 3); }
    const hgr = hg.createLinearGradient(0, y, 0, y + bh); hgr.addColorStop(0, '#999'); hgr.addColorStop(.15, '#fff'); hgr.addColorStop(.85, '#eee'); hgr.addColorStop(1, '#888');
    hg.fillStyle = hgr; hg.beginPath(); hg.roundRect(x + 3, y + 3, bw - 6, bh - 6, 7); hg.fill();
  }
  const map = new THREE.CanvasTexture(cc); map.encoding = THREE.sRGBEncoding; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return {map, normal: normalFromHeight(hc, 3.2)};
}
function asphaltTextures(){
  const n = noiseCanvas(256, 6, 4, 11);
  const g = n.getContext('2d'), img = g.getImageData(0, 0, 256, 256), d = img.data;
  const cc = document.createElement('canvas'); cc.width = cc.height = 256; const cg = cc.getContext('2d'), ci = cg.createImageData(256, 256), cd = ci.data;
  for (let k = 0; k < d.length; k += 4){ const v = d[k] / 255, sp = Math.random() < .04 ? 25 : 0; const b = 58 + v * 28 + sp; cd[k] = b; cd[k + 1] = b + 2; cd[k + 2] = b + 6; cd[k + 3] = 255; }
  cg.putImageData(ci, 0, 0);
  const map = new THREE.CanvasTexture(cc); map.encoding = THREE.sRGBEncoding; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return {map, normal: normalFromHeight(n, 2)};
}

/* ---------------- Céu procedural ---------------- */
let skyMesh, skyUni, envRT = null, envHour = -99, skySceneEnv;
const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * .99999; }`;
const SKY_FS = `
uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform float t; uniform float clouds;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = .5; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= .5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), .55)) : mix(hor, bot, clamp(-h * 4.0, 0.0, 1.0));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  c += sunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 12.0) * .35 + pow(sd, 3.0) * .08);
  if (h > 0.0){
    vec2 uv = d.xz / (h + .18) * 1.6 + vec2(t * .012, t * .004);
    float n = fbm(uv);
    float cl = smoothstep(.52 - clouds * .12, .82, n) * smoothstep(0.0, .25, h);
    vec3 cc = mix(vec3(1.0), sunCol * .9 + hor * .3, .25) * (1.0 - night * .82);
    c = mix(c, cc, cl * .85);
    float st = step(.9975, hash(floor(d.xz / (h + .3) * 400.0))) * night * smoothstep(.05, .3, h);
    c += vec3(st);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <encodings_fragment>
}`;
function buildSky(){
  skyUni = {top: {value: new THREE.Color('#3f86d6')}, hor: {value: new THREE.Color('#bfdcf0')}, bot: {value: new THREE.Color('#6f8f5a')}, sunDir: {value: new THREE.Vector3(.3, .8, .2)}, sunCol: {value: new THREE.Color('#fff2d8')}, night: {value: 0}, t: {value: 0}, clouds: {value: .5}};
  const mat = new THREE.ShaderMaterial({uniforms: skyUni, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false});
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  skyMesh.renderOrder = -10; skyMesh.frustumCulled = false;
  scene.add(skyMesh);
  skySceneEnv = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({uniforms: skyUni, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false}));
  skySceneEnv.add(envSky);
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({color: 0x56703f}));
  grd.rotation.x = -Math.PI / 2; grd.position.y = -2; skySceneEnv.add(grd);
}
function updateEnv(hour){
  if (Math.abs(hour - envHour) < .5 && envRT) return;
  envHour = hour;
  const old = envRT;
  envRT = pmrem.fromScene(skySceneEnv, .04);
  scene.environment = envRT.texture;
  if (old) old.dispose();
}

/* ---------------- Modos ---------------- */
R3.setMode = function(m){
  if (m === '2d'){
    if (R3.active){ FP.Cam.x = C.tx * T; FP.Cam.y = C.ty * T; FP.Cam.zoom = U.clamp(46 / C.dist, FP.Cam.minZ, FP.Cam.maxZ); }
    R3.active = false; R3.mode = '2d';
    document.body.classList.remove('mode3d');
    if (canvas) canvas.style.display = 'none';
    return true;
  }
  if (!init()) return false;
  if (!R3.active){
    C.tx = FP.Cam.x / T; C.ty = FP.Cam.y / T;
    C.distT = C.dist = U.clamp(46 / FP.Cam.zoom, 8, 150);
  }
  R3.active = true; R3.mode = m;
  document.body.classList.add('mode3d');
  canvas.style.display = 'block';
  const M = MODES[m];
  C.fovT = M.fov; C.pitchT = M.pitch;
  if (m === 'iso'){ C.yawT = Math.PI / 4 + Math.round((C.yawT - Math.PI / 4) / (Math.PI / 2)) * Math.PI / 2; C.distT = U.clamp(C.distT * 1.3, 12, 150); }
  if (m === 'livre') C.distT = U.clamp(C.distT * .8, 6, 150);
  if (m === 'seguir'){
    const sel = FP.UI.selected && FP.UI.selected.type === 'animal' ? FP.G.animals.find(a => a.id === FP.UI.selected.id) : null;
    follow.animal = sel || U.pick(FP.G.animals.filter(a => !a.quar)) || null;
    if (!follow.animal){ FP.UI.toast('Não há animais para seguir: mostrando o tour.', 'info'); return R3.setMode('tour'); }
    C.distT = 7;
    FP.UI.toast(`🎯 Seguindo ${follow.animal.name} (${FP.SPECIES[follow.animal.sp].nome}). Selecione outro animal para trocar.`, 'info');
  }
  if (m === 'visitante'){
    follow.visitor = pickVisitor();
    if (!follow.visitor){ FP.UI.toast('Ainda não há visitantes no parque: mostrando o tour.', 'info'); return R3.setMode('tour'); }
    follow.look = null;
  }
  if (m === 'tour'){ follow.tourT = 0; C.distT = 20; }
  return true;
};
function pickVisitor(){ const vs = FP.G.visitors.filter(v => v.state === 'park' || v.state === 'walk' || v.tile >= 0); return vs.length ? U.pick(vs) : null; }
R3.followAnimal = function(a){ follow.animal = a; };

R3.panBy = function(dx, dy){
  if (R3.mode === 'seguir' || R3.mode === 'visitante' || R3.mode === 'tour'){ R3.setMode('livre'); FP.UI.renderCamBar(); }
  const wpp = 2 * C.dist * Math.tan(C.fov * Math.PI / 360) / Math.max(1, H);
  const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), sp = Math.max(.35, Math.sin(C.pitch));
  C.tx -= (cy * dx) * wpp; C.ty -= (-sy * dx) * wpp;
  C.tx += (-sy * dy) * wpp / sp; C.ty += (-cy * dy) * wpp / sp;
  clampTarget();
};
R3.moveBy = function(mx, my, dt){
  if (R3.mode === 'seguir' || R3.mode === 'visitante' || R3.mode === 'tour'){ R3.setMode('livre'); FP.UI.renderCamBar(); }
  const s = (8 + C.dist * .9) * dt, sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
  C.tx += cy * mx * s + (-sy) * (-my) * s;
  C.ty += (-sy) * mx * s + (-cy) * (-my) * s;
  clampTarget();
};
R3.orbitBy = function(dx, dy){
  if (R3.mode === 'iso' && Math.abs(dx) > 0){ R3.setMode('livre'); FP.UI.renderCamBar(); }
  if (R3.mode === 'tour'){ R3.setMode('livre'); FP.UI.renderCamBar(); }
  C.yawT -= dx * .006;
  C.pitchT = U.clamp(C.pitchT + dy * .005, .1, 1.45);
};
R3.zoomBy = function(f, sx, sy){
  const old = C.distT;
  C.distT = U.clamp(C.distT / f, R3.mode === 'seguir' ? 2.5 : 3.5, 170);
  if (sx !== undefined && f > 1 && (R3.mode === 'iso' || R3.mode === 'livre')){
    const p = R3.screenToWorld(sx, sy);
    const k = (1 - C.distT / old) * .55;
    C.tx += (p.x / T - C.tx) * k; C.ty += (p.y / T - C.ty) * k; clampTarget();
  }
};
R3.rotateStep = function(dir){
  if (R3.mode !== 'iso' && R3.mode !== 'livre'){ R3.setMode('iso'); FP.UI.renderCamBar(); }
  const q = Math.PI / 2;
  C.yawT = Math.PI / 4 + (Math.round((C.yawT - Math.PI / 4) / q) + dir) * q;
  const names = ['Sul', 'Oeste', 'Norte', 'Leste'];
  const k = ((Math.round((C.yawT - Math.PI / 4) / q) % 4) + 4) % 4;
  FP.UI.toast('🧭 Vista ' + names[k], 'info');
};
function clampTarget(){ C.tx = U.clamp(C.tx, 0, FP.W); C.ty = U.clamp(C.ty, 0, FP.H); }

/* ---------------- Conversões tela/mundo ---------------- */
let _ray, _ndc, _plane, _hit;
R3.screenToWorld = function(sx, sy){
  if (!_ray){ _ray = new THREE.Raycaster(); _ndc = new THREE.Vector2(); _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); _hit = new THREE.Vector3(); }
  _ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  if (_ray.ray.intersectPlane(_plane, _hit)) return {x: _hit.x * T, y: _hit.z * T};
  return {x: C.tx * T, y: C.ty * T};
};
let _p3;
R3.worldToScreen = function(wx, wy, h){
  if (!_p3) _p3 = new THREE.Vector3();
  _p3.set(wx, h || 0, wy).project(camera);
  return {x: (_p3.x + 1) / 2 * W, y: (1 - _p3.y) / 2 * H, vis: _p3.z < 1 && _p3.z > -1 && _p3.x > -1.2 && _p3.x < 1.2 && _p3.y > -1.2 && _p3.y < 1.2};
};
R3.labelDetail = () => R3.mode === 'visitante' ? 1 : U.clamp((70 - C.dist) / 50, 0, 1);
R3.miniInfo = () => ({x: C.tx, y: C.ty, yaw: C.yaw});

/* =============== CONSTRUÇÃO DA CENA =============== */
let SUB = 2;                  // subdivisões do terreno por tile (1 nas qualidades baixas; definido ao iniciar o 3D)
const WATER_Y = -.1;          // nível da água
let terrainMesh, terrainGeo, waterMesh, pathMesh, roadMesh, curbMesh, grassMesh, lineMesh, fenceMesh, postMesh, ownedLineMesh, overlayMesh, overlayCanvas, overlayCtx, overlayTex;
let decoGroup, bldGroup, signGroup, animalGroup, carGroup, haloGroup;
let bulbMesh, poolMesh;
let pTorso, pHead, pHair, pLeg, pArm;
const prev = {};
const OVS = 6;
let waterNormal;
function buildStatic(){
  SUB = Q().sub;
  // --- terreno contínuo ---
  const VW = FP.W * SUB + 1, VH = FP.H * SUB + 1;
  terrainGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(VW * VH * 3), uv = new Float32Array(VW * VH * 2);
  for (let vy = 0; vy < VH; vy++) for (let vx = 0; vx < VW; vx++){ const k = vy * VW + vx; pos[k * 3] = vx / SUB; pos[k * 3 + 2] = vy / SUB; uv[k * 2] = vx / SUB * .5; uv[k * 2 + 1] = vy / SUB * .5; }
  const idx = new Uint32Array((VW - 1) * (VH - 1) * 6); let q = 0;
  for (let vy = 0; vy < VH - 1; vy++) for (let vx = 0; vx < VW - 1; vx++){
    const a = vy * VW + vx, b = a + 1, c = a + VW, d = c + 1;
    if ((vx + vy) % 2){ idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
    else { idx[q++] = a; idx[q++] = c; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = b; }
  }
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  terrainGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(VW * VH * 3), 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(VW * VH * 3), 3));
  terrainGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  terrainGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  const detail = canvasTex(256, (g, s) => { g.drawImage(noiseCanvas(256, 9, 4, 3), 0, 0); const img = g.getImageData(0, 0, s, s), d = img.data; for (let k = 0; k < d.length; k += 4){ const v = 232 + (d[k] / 255 - .5) * 70 + (Math.random() - .5) * 26; d[k] = d[k + 1] = d[k + 2] = Math.max(0, Math.min(255, v)); } g.putImageData(img, 0, 0); }, false, true);
  matTerrain = PBR({vertexColors: true, map: detail, roughness: .95, metalness: 0, envMapIntensity: .5});
  terrainMesh = new THREE.Mesh(terrainGeo, matTerrain);
  terrainMesh.receiveShadow = true; terrainMesh.frustumCulled = false;
  scene.add(terrainMesh);
  // --- água refletiva animada ---
  waterNormal = normalFromHeight(noiseCanvas(256, 4, 4, 21), 2.6);
  waterNormal.repeat.set(FP.W / 3, FP.H / 3);
  matWater = PBR({color: col('#2a86b8'), roughness: .06, metalness: .05, transparent: true, opacity: .8, normalMap: waterNormal, normalScale: new THREE.Vector2(.35, .35), envMapIntensity: 1.25});
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(FP.W, FP.H), matWater);
  waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(FP.W / 2, WATER_Y, FP.H / 2); waterMesh.receiveShadow = true;
  scene.add(waterMesh);
  // --- caminhos e estradas ---
  const pv = paverTextures();
  matPath = PBR({map: pv.map, normalMap: pv.normal, normalScale: new THREE.Vector2(.9, .9), roughness: .88, envMapIntensity: .6, polygonOffset: true, polygonOffsetFactor: -1});
  const as = asphaltTextures();
  matRoad = PBR({map: as.map, normalMap: as.normal, normalScale: new THREE.Vector2(.5, .5), roughness: .92, envMapIntensity: .4, polygonOffset: true, polygonOffsetFactor: -1});
  pathMesh = new THREE.Mesh(new THREE.BufferGeometry(), matPath); pathMesh.receiveShadow = true; pathMesh.frustumCulled = false; scene.add(pathMesh);
  roadMesh = new THREE.Mesh(new THREE.BufferGeometry(), matRoad); roadMesh.receiveShadow = true; roadMesh.frustumCulled = false; scene.add(roadMesh);
  curbMesh = new THREE.InstancedMesh(M3.S.rbox(1, .07, .1, .025, 1), matCurb, 24000);
  curbMesh.receiveShadow = true; curbMesh.castShadow = true; curbMesh.frustumCulled = false; curbMesh.count = 0; scene.add(curbMesh);
  // faixas da estrada
  lineMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), PBR({color: col('#f2d14b'), roughness: .6}), 600);
  lineMesh.frustumCulled = false; lineMesh.count = 0; scene.add(lineMesh);
  // --- grama instanciada com vento ---
  buildGrass();
  // --- cercas ---
  const rail = new THREE.CylinderGeometry(.028, .028, 1, 8); rail.rotateZ(Math.PI / 2);
  fenceMesh = new THREE.InstancedMesh(rail, matFence, 40000);
  fenceMesh.castShadow = true; fenceMesh.receiveShadow = true; fenceMesh.frustumCulled = false; fenceMesh.count = 0; scene.add(fenceMesh);
  const postG = M3.S.lathe('fpost', [[0, 0], [.055, 0], [.05, .88], [.035, .96], [0, .98]], 10);
  postMesh = new THREE.InstancedMesh(postG, matPost, 20000);
  postMesh.castShadow = true; postMesh.receiveShadow = true; postMesh.frustumCulled = false; postMesh.count = 0; scene.add(postMesh);
  ownedLineMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matLine, 4000);
  ownedLineMesh.frustumCulled = false; ownedLineMesh.count = 0; scene.add(ownedLineMesh);
  // --- sobreposição das ferramentas ---
  overlayCanvas = document.createElement('canvas'); overlayCanvas.width = FP.W * OVS; overlayCanvas.height = FP.H * OVS;
  overlayCtx = overlayCanvas.getContext('2d');
  overlayTex = new THREE.CanvasTexture(overlayCanvas); overlayTex.encoding = THREE.sRGBEncoding;
  matOverlay = new THREE.MeshBasicMaterial({map: overlayTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false});
  overlayMesh = new THREE.Mesh(new THREE.PlaneGeometry(FP.W, FP.H), matOverlay);
  overlayMesh.rotation.x = -Math.PI / 2; overlayMesh.position.set(FP.W / 2, .08, FP.H / 2); overlayMesh.renderOrder = 20; overlayMesh.visible = false;
  scene.add(overlayMesh);
  decoGroup = new THREE.Group(); bldGroup = new THREE.Group(); signGroup = new THREE.Group(); animalGroup = new THREE.Group(); carGroup = new THREE.Group(); haloGroup = new THREE.Group();
  scene.add(decoGroup, bldGroup, signGroup, animalGroup, carGroup, haloGroup);
  bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 12, 8), matGlow, 3000); bulbMesh.frustumCulled = false; bulbMesh.count = 0; scene.add(bulbMesh);
  poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matPool, 3000); poolMesh.frustumCulled = false; poolMesh.renderOrder = 5; poolMesh.count = 0; scene.add(poolMesh);
  // --- pessoas (instanciadas) ---
  const P = 1700, pg = M3.personGeos();
  const im = (g, n, mat) => { const m = new THREE.InstancedMesh(g, mat || matPeople, n); withColors(m); m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); return m; };
  pTorso = im(pg.torso, P); pHead = im(pg.head, P); pHair = im(pg.hair, P); pLeg = im(pg.leg, P * 2); pArm = im(pg.arm, P * 2);
  buildCars();
  prev.ground = null;
}
function withColors(m){ const n = m.instanceMatrix.count; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
let lastG = null;
function resetWorld(){
  prev.ground = null; decoSig = '-'; encSig = '-'; signKey = '-'; grassSig = '-';
  animalObjs.forEach(o => animalGroup.remove(o.g)); animalObjs.clear();
}

/* ---------------- Terreno: alturas e cores ---------------- */
const tColCache = {};
function tileColor(G, i, x, y){
  const t = FP.TERRAINS[G.ground[i]];
  let k = t.id * 4 + Math.floor(U.hash(x, y) * 4);
  let c = tColCache[k];
  if (!c){ c = tColCache[k] = lerpC(t.cor, t.cor2, (k % 4) / 3); }
  return c;
}
let waterDist = null;
function computeWaterDist(G){
  const n = FP.W * FP.H; if (!waterDist) waterDist = new Uint8Array(n);
  const qx = [];
  for (let i = 0; i < n; i++){ if (G.ground[i] === FP.T.agua){ waterDist[i] = 9; } else { waterDist[i] = 0; } }
  for (let pass = 1; pass <= 4; pass++){
    for (let i = 0; i < n; i++){
      if (waterDist[i] !== 9) continue;
      const x = i % FP.W, y = (i / FP.W) | 0;
      const nb = [x > 0 ? waterDist[i - 1] : 9, x < FP.W - 1 ? waterDist[i + 1] : 9, y > 0 ? waterDist[i - FP.W] : 9, y < FP.H - 1 ? waterDist[i + FP.W] : 9];
      if (nb.some(v => v === pass - 1)) qx.push(i);
    }
    qx.forEach(i => waterDist[i] = pass); qx.length = 0;
  }
}
function updateTerrain(G, all){
  const n = FP.W * FP.H;
  if (!prev.ground){ prev.ground = new Uint8Array(n).fill(255); prev.path = new Uint8Array(n).fill(255); prev.road = new Uint8Array(n).fill(255); prev.owned = new Uint8Array(n).fill(255); }
  let changed = false, ownedChanged = false, pathChanged = false;
  for (let i = 0; i < n; i++){
    if (prev.ground[i] !== G.ground[i] || prev.owned[i] !== G.owned[i] || prev.path[i] !== G.path[i] || prev.road[i] !== G.road[i]){
      if (prev.owned[i] !== G.owned[i]) ownedChanged = true;
      if (prev.path[i] !== G.path[i] || prev.road[i] !== G.road[i]) pathChanged = true;
      prev.ground[i] = G.ground[i]; prev.path[i] = G.path[i]; prev.road[i] = G.road[i]; prev.owned[i] = G.owned[i];
      changed = true;
    }
  }
  if (!changed && !all) return false;
  computeWaterDist(G);
  if (ownedChanged || all || !ownedDist) computeOwnedDist(G);
  const VW = FP.W * SUB + 1, VH = FP.H * SUB + 1;
  const P = terrainGeo.attributes.position.array, Cc = terrainGeo.attributes.color.array;
  const agua = FP.T.agua, tmp = new THREE.Color(), grey = new THREE.Color(), bottom = col('#5f6a4a'), deep = col('#2b4a52');
  const isW = new Float32Array(FP.W * FP.H), wdep = new Float32Array(FP.W * FP.H);
  for (let i = 0; i < FP.W * FP.H; i++){ isW[i] = G.ground[i] === agua ? 1 : 0; wdep[i] = Math.min(3, waterDist[i]); }
  for (let vy = 0; vy < VH; vy++){
    for (let vx = 0; vx < VW; vx++){
      const k = vy * VW + vx, X = vx / SUB, Y = vy / SUB;
      // posição levemente "tremida" por ruído: margens e manchas de bioma orgânicas
      const jx = X + (M3.vnoise(X * .55, 3.1, Y * .55) - .5) * .9, jy = Y + (M3.vnoise(X * .55, 8.7, Y * .55) - .5) * .9;
      const cx = Math.floor(jx - .5), cy = Math.floor(jy - .5);
      let r = 0, g = 0, b = 0, cw = 0, wat = 0, ww = 0, dep = 0, own = 0, pav = 0;
      for (let ty = cy - 1; ty <= cy + 2; ty++){ if (ty < 0 || ty >= FP.H) continue;
        for (let tx = cx - 1; tx <= cx + 2; tx++){ if (tx < 0 || tx >= FP.W) continue;
          const i = ty * FP.W + tx;
          const dx = tx + .5 - jx, dy = ty + .5 - jy, d = Math.sqrt(dx * dx + dy * dy);
          const w = Math.max(0, 1.5 - d); if (w <= 0) continue;
          const w2 = w * w;
          wat += isW[i] * w2; dep += wdep[i] * isW[i] * w2; ww += w2;
          if (!isW[i]){ const c = tileColor(G, i, tx, ty); const wc = w2 * w2; r += c.r * wc; g += c.g * wc; b += c.b * wc; cw += wc; }
        }
      }
      // tiles que tocam o vértice (caminho / terreno adquirido): sem tremido
      for (let ty = Math.ceil(Y) - 1; ty <= Math.floor(Y); ty++) for (let tx = Math.ceil(X) - 1; tx <= Math.floor(X); tx++){
        if (tx < 0 || ty < 0 || tx >= FP.W || ty >= FP.H) continue;
        const i = ty * FP.W + tx; if (G.owned[i] || G.road[i]) own++; if (G.path[i] || G.road[i]) pav++;
      }
      const wf = ww ? wat / ww : 0, depth = wat ? dep / wat : 0;
      const t = U.clamp((wf - .28) / .44, 0, 1), sm = t * t * (3 - 2 * t);
      const landH = (M3.fbm(X * .35, 1, Y * .35, 2) - .5) * .05 + (own ? 0 : (M3.fbm(X * .08, 5, Y * .08, 3) - .45) * .5 * U.clamp(distOwned(G, X, Y) / 6, 0, 1));
      const waterH = -(.18 + depth * .15) - M3.vnoise(X * .9, 0, Y * .9) * .06;
      let h = landH + (waterH - landH) * sm;
      if (pav) h = -.01;
      P[k * 3 + 1] = h;
      if (cw) tmp.setRGB(r / cw, g / cw, b / cw); else tmp.copy(bottom);
      const nz = .9 + M3.fbm(X * .45, 7, Y * .45, 3) * .2;
      tmp.multiplyScalar(nz);
      // margem úmida / areia e fundo do lago
      if (h < .0 && sm > 0){ tmp.lerp(col('#8f8058'), U.clamp(sm * 2, 0, 1) * .6); tmp.lerp(bottom, U.clamp((sm - .5) * 2, 0, 1) * .6).lerp(deep, U.clamp(-h - .25, 0, 1) * .8); }
      if (!own){ const l = (tmp.r + tmp.g + tmp.b) / 3; grey.setRGB(l, l, l); tmp.lerp(grey, .22).multiplyScalar(.82); }
      Cc[k * 3] = tmp.r; Cc[k * 3 + 1] = tmp.g; Cc[k * 3 + 2] = tmp.b;
    }
  }
  terrainGeo.attributes.position.needsUpdate = true; terrainGeo.attributes.color.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  if (pathChanged || all) rebuildPaths(G);
  if (ownedChanged || all) rebuildOwnedLine(G);
  return true;
}
/* distância (em tiles) até o terreno adquirido mais próximo — relevo mais acidentado longe do parque */
let ownedDist = null;
function computeOwnedDist(G){
  {
    ownedDist = new Float32Array(FP.W * FP.H).fill(99);
    const q = [];
    for (let i = 0; i < FP.W * FP.H; i++) if (G.owned[i] || G.road[i]){ ownedDist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++){ const i = q[h], x = i % FP.W, y = (i / FP.W) | 0, d = ownedDist[i] + 1; if (d > 8) continue; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= FP.W || ny >= FP.H) return; const j = ny * FP.W + nx; if (ownedDist[j] > d){ ownedDist[j] = d; q.push(j); } }); }
  }
}
function distOwned(G, X, Y){
  const tx = U.clamp(Math.floor(X - .01), 0, FP.W - 1), ty = U.clamp(Math.floor(Y - .01), 0, FP.H - 1);
  return ownedDist[ty * FP.W + tx];
}
/* altura do chão num ponto (para objetos, animais e pessoas) */
function groundY(G, x, y){
  const i = U.idx(U.clamp(Math.floor(x), 0, FP.W - 1), U.clamp(Math.floor(y), 0, FP.H - 1));
  if (G.path[i]) return .03;
  if (G.road[i]) return .02;
  if (G.ground[i] === FP.T.agua) return WATER_Y;
  return 0;
}

/* ---------------- Caminhos e estradas ---------------- */
let M4, Q0, V3, S3;
function mats(){ if (!M4){ M4 = new THREE.Matrix4(); Q0 = new THREE.Quaternion(); V3 = new THREE.Vector3(); S3 = new THREE.Vector3(); } }
function quadGeo(list, y){
  const pos = [], nor = [], uv = [], idx = [];
  list.forEach(i => {
    const x = i % FP.W, z = (i / FP.W) | 0, b = pos.length / 3;
    pos.push(x, y, z, x + 1, y, z, x, y, z + 1, x + 1, y, z + 1);
    for (let k = 0; k < 4; k++) nor.push(0, 1, 0);
    uv.push(x, -z, x + 1, -z, x, -z - 1, x + 1, -z - 1);
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function rebuildPaths(G){
  mats();
  const paths = [], roads = [];
  for (let i = 0; i < FP.W * FP.H; i++){ if (G.path[i]) paths.push(i); else if (G.road[i]) roads.push(i); }
  pathMesh.geometry.dispose(); pathMesh.geometry = quadGeo(paths, .03);
  roadMesh.geometry.dispose(); roadMesh.geometry = quadGeo(roads, .02);
  // meio-fio nas bordas do caminho
  let k = 0; const max = curbMesh.instanceMatrix.count;
  const isP = (x, y) => x >= 0 && y >= 0 && x < FP.W && y < FP.H && (G.path[y * FP.W + x] || G.road[y * FP.W + x]);
  const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  paths.forEach(i => {
    const x = i % FP.W, y = (i / FP.W) | 0;
    if (k >= max - 4) return;
    if (!isP(x, y - 1)){ V3.set(x + .5, 0, y + .04); S3.set(1, 1, 1); M4.compose(V3, Q0, S3); curbMesh.setMatrixAt(k++, M4); }
    if (!isP(x, y + 1)){ V3.set(x + .5, 0, y + .96); S3.set(1, 1, 1); M4.compose(V3, Q0, S3); curbMesh.setMatrixAt(k++, M4); }
    if (!isP(x - 1, y)){ V3.set(x + .04, 0, y + .5); S3.set(1, 1, 1); M4.compose(V3, qr, S3); curbMesh.setMatrixAt(k++, M4); }
    if (!isP(x + 1, y)){ V3.set(x + .96, 0, y + .5); S3.set(1, 1, 1); M4.compose(V3, qr, S3); curbMesh.setMatrixAt(k++, M4); }
  });
  curbMesh.count = k; curbMesh.instanceMatrix.needsUpdate = true; stash(curbMesh);
  // faixas
  const RW = FP.World; let l = 0;
  const add = (x, y, z, w, h, d) => { V3.set(x, y, z); S3.set(w, h, d); M4.compose(V3, Q0, S3); lineMesh.setMatrixAt(l++, M4); };
  for (let y = RW.ROAD_Y0; y < RW.AVENUE_Y - 1; y++) add(RW.ROAD_X + 1, .025, y + .5, .07, .01, .45);
  for (let x = 0; x < FP.W; x++) add(x + .5, .025, RW.AVENUE_Y + 1, .45, .01, .07);
  lineMesh.count = l; lineMesh.instanceMatrix.needsUpdate = true; stash(lineMesh);
}
function rebuildOwnedLine(G){
  mats();
  let k = 0; const ch = FP.CHUNK, Wd = FP.World;
  const add = (x, z, w, d) => { if (k >= 3990) return; V3.set(x, .12, z); S3.set(w, .03, d); M4.compose(V3, Q0, S3); ownedLineMesh.setMatrixAt(k++, M4); };
  for (let cy = 0; cy * ch < FP.H; cy++) for (let cx = 0; cx * ch < FP.W; cx++){
    if (!Wd.chunkOwned(G, cx, cy)) continue;
    const X = cx * ch, Y = cy * ch;
    for (let s = 0; s < ch; s += 2){
      if (!Wd.chunkOwned(G, cx, cy - 1)) add(X + s + .5, Y, .7, .05);
      if (!Wd.chunkOwned(G, cx, cy + 1)) add(X + s + .5, Y + ch, .7, .05);
      if (!Wd.chunkOwned(G, cx - 1, cy)) add(X, Y + s + .5, .05, .7);
      if (!Wd.chunkOwned(G, cx + 1, cy)) add(X + ch, Y + s + .5, .05, .7);
    }
  }
  ownedLineMesh.count = k; ownedLineMesh.instanceMatrix.needsUpdate = true; stash(ownedLineMesh);
}

/* ---------------- Grama (instâncias com vento) ---------------- */
function grassGeo(){
  // tufo com 9 lâminas curvas, cor escura na base e clara na ponta
  const pos = [], colA = [], idx = [], nor = [];
  const r = U.rng(5);
  for (let b = 0; b < 9; b++){
    const a = r() * Math.PI * 2, d = r() * .1, h = .1 + r() * .11, w = .02 + r() * .012, lean = .2 + r() * .3;
    const bx = Math.cos(a) * d, bz = Math.sin(a) * d, dx = Math.cos(a + 1.57) * w, dz = Math.sin(a + 1.57) * w;
    const fx = Math.cos(a) * lean * h, fz = Math.sin(a) * lean * h;
    const base = pos.length / 3;
    pos.push(bx - dx, 0, bz - dz, bx + dx, 0, bz + dz, bx - dx * .6 + fx * .45, h * .55, bz - dz * .6 + fz * .45, bx + dx * .6 + fx * .45, h * .55, bz + dz * .6 + fz * .45, bx + fx, h, bz + fz);
    [0, 0, .55, .55, 1].forEach(t => { colA.push(.72 + t * .38, .72 + t * .38, .72 + t * .38); nor.push(0, 1, 0); });
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  g.setIndex(idx);
  return g;
}
function buildGrass(){
  matGrass = new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .9, envMapIntensity: .4});
  matGrass.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float hh = max(position.y, 0.0) * 4.0;
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float wv = sin(uTime * 1.6 + ip.x * .45 + ip.y * .3) + .45 * sin(uTime * 2.9 + ip.x * 1.3);
      transformed.x += wv * hh * hh * .02;
      transformed.z += cos(uTime * 1.3 + ip.y * .5) * hh * hh * .012;
      #endif`);
  };
  grassMesh = new THREE.InstancedMesh(grassGeo(), matGrass, 60000);
  withColors(grassMesh); grassMesh.frustumCulled = false; grassMesh.receiveShadow = true; grassMesh.count = 0;
  scene.add(grassMesh);
}
let grassSig = '';
function rebuildGrass(G){
  mats();
  if (!Q().grass){ grassMesh.count = 0; stash(grassMesh); return; }
  const PAL = {[FP.T.grama]: ['#5d9a3c', '#86c254', 7], [FP.T.savana]: ['#b09a44', '#e2cf78', 6], [FP.T.floresta]: ['#356a2e', '#5aa04a', 5], [FP.T.cerrado]: ['#8a7f3a', '#b9a656', 3], [FP.T.lama]: ['#556a38', '#7a8f4a', 2], [FP.T.mistico]: ['#7a5ac8', '#c8a8ff', 3], [FP.T.neve]: ['#c8d8de', '#f4fbff', 0]};
  let k = 0; const max = grassMesh.instanceMatrix.count, c = new THREE.Color(), q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < FP.W * FP.H && k < max - 6; i++){
    if (G.path[i] || G.road[i]) continue;
    const pal = PAL[G.ground[i]]; if (!pal || !pal[2]) continue;
    const o = G.obj[i];
    if (o >= 0){ const ob = G.objects[o]; if (ob && (ob.kind === 'building' || (FP.DECOS[ob.type] && FP.DECOS[ob.type].bloqueia))) continue; }
    const x = i % FP.W, y = (i / FP.W) | 0;
    const own = G.owned[i];
    const n = Math.round((own ? pal[2] : Math.max(1, pal[2] - 4)) * Q().grass);
    const tc = tileColor(G, i, x, y);
    for (let j = 0; j < n; j++){
      const hx = U.hash(x, y, 30 + j), hz = U.hash(x, y, 40 + j);
      const s = (G.ground[i] === FP.T.savana ? 1.5 : 1) * (.75 + U.hash(x, y, 20 + j) * .6);
      q.setFromAxisAngle(ax, U.hash(x, y, 60 + j) * 6.28);
      V3.set(x + .1 + hx * .8, 0, y + .1 + hz * .8); S3.set(s, s, s); M4.compose(V3, q, S3); grassMesh.setMatrixAt(k, M4);
      c.copy(lerpC(pal[0], pal[1], U.hash(x, y, 50 + j))).lerp(tc, .45);
      if (!own) c.multiplyScalar(.8);
      grassMesh.setColorAt(k, c); k++;
    }
  }
  grassMesh.count = k; grassMesh.instanceMatrix.needsUpdate = true; grassMesh.instanceColor.needsUpdate = true;
  stash(grassMesh);
}

/* ---------------- Cercas ---------------- */
function rebuildFences(G){
  mats();
  let k = 0, p = 0; const posts = new Set();
  const maxF = fenceMesh.instanceMatrix.count, maxP = postMesh.instanceMatrix.count;
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const rail = (x, z, horiz) => { for (const hh of [.3, .58, .84]){ if (k >= maxF) return; V3.set(x, hh, z); S3.set(1, 1, 1); M4.compose(V3, horiz ? Q0 : qz, S3); fenceMesh.setMatrixAt(k++, M4); } };
  Object.values(G.enclosures).forEach(e => {
    e.tiles.forEach(i => {
      const x = i % FP.W, y = (i / FP.W) | 0, id = e.id;
      const top = y === 0 || G.enc[i - FP.W] !== id, bot = y === FP.H - 1 || G.enc[i + FP.W] !== id;
      const lef = x === 0 || G.enc[i - 1] !== id, rig = x === FP.W - 1 || G.enc[i + 1] !== id;
      if (top){ rail(x + .5, y + .04, true); posts.add(x + ',' + y); posts.add((x + 1) + ',' + y); }
      if (bot){ rail(x + .5, y + .96, true); posts.add(x + ',' + (y + 1)); posts.add((x + 1) + ',' + (y + 1)); }
      if (lef){ rail(x + .04, y + .5, false); posts.add(x + ',' + y); posts.add(x + ',' + (y + 1)); }
      if (rig){ rail(x + .96, y + .5, false); posts.add((x + 1) + ',' + y); posts.add((x + 1) + ',' + (y + 1)); }
    });
  });
  posts.forEach(s => { if (p >= maxP) return; const [x, y] = s.split(','); V3.set(Math.min(FP.W - .04, Math.max(.04, +x)), 0, Math.min(FP.H - .04, Math.max(.04, +y))); S3.set(1, 1, 1); M4.compose(V3, Q0, S3); postMesh.setMatrixAt(p++, M4); });
  fenceMesh.count = k; postMesh.count = p;
  fenceMesh.instanceMatrix.needsUpdate = true; postMesh.instanceMatrix.needsUpdate = true;
  stash(fenceMesh); stash(postMesh);
}

/* ---------------- Vegetação, decoração e brinquedos ---------------- */
let decoSig = '', decoMeshes = [], halos = [];
function rebuildDecos(G){
  mats();
  decoMeshes.forEach(m => decoGroup.remove(m));
  decoMeshes = [];
  halos.forEach(h => haloGroup.remove(h)); halos = [];
  const groups = {}; const bulbs = [], pools = [];
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'deco') return;
    const d = FP.DECOS[o.type], vv = o.variant % 3;
    (groups[o.type + '|' + vv] = groups[o.type + '|' + vv] || []).push(o);
    if (d.luz){
      const [ox, oz] = d.naBorda ? FP.World.borderOffset(G, o.x, o.y) : [0, 0];
      (M3.LIGHTS[o.type] || [[0, .5, 0]]).forEach(([lx, ly, lz]) => bulbs.push([o.x + .5 + ox + lx, ly + (G.path[U.idx(o.x, o.y)] ? .03 : 0), o.y + .5 + oz + lz]));
      pools.push([o.x + .5 + ox, o.y + .5 + oz, (d.alcance || 3) * 1.7]);
    } else if (o.type === 'cristal' || o.type === 'arvore_mistica') pools.push([o.x + .5, o.y + .5, 2.4]);
  });
  Object.keys(groups).forEach(k => {
    const [type, vv] = k.split('|'); const list = groups[k], d = FP.DECOS[type];
    const im = new THREE.InstancedMesh(M3.decoGeo(type, +vv), matStd, list.length);
    im.castShadow = !(type === 'flores' || type === 'aguape' || type === 'boia'); im.receiveShadow = true;
    list.forEach((o, i) => {
      const [ox, oz] = d.naBorda ? FP.World.borderOffset(G, o.x, o.y) : [0, 0];
      const plant = d.planta && !d.naAgua;
      const sc = plant ? .85 + U.hash(o.x, o.y, 5) * .35 : 1;
      const ry = d.naBorda || type === 'placa' ? 0 : Math.floor(U.hash(o.x, o.y, 6) * 4) * Math.PI / 2 + ((plant || d.brinquedo) ? U.hash(o.x, o.y, 8) * 1.2 : 0);
      const base = d.naAgua ? WATER_Y : (G.path[U.idx(o.x, o.y)] ? .03 : 0);
      V3.set(o.x + .5 + ox, base, o.y + .5 + oz); Q0.setFromAxisAngle(_up(), ry); S3.set(sc, sc, sc);
      M4.compose(V3, Q0, S3); im.setMatrixAt(i, M4);
    });
    Q0.set(0, 0, 0, 1);
    im.frustumCulled = false;
    decoGroup.add(im); decoMeshes.push(im); stash(im);
  });
  bulbs.forEach((b, i) => { if (i >= 3000) return; V3.set(b[0], b[1], b[2]); S3.set(1, 1, 1); M4.compose(V3, Q0, S3); bulbMesh.setMatrixAt(i, M4); if (i < Q().halos){ const s = new THREE.Sprite(matHalo); s.position.set(b[0], b[1], b[2]); s.scale.set(1.1, 1.1, 1.1); haloGroup.add(s); halos.push(s); } });
  bulbMesh.count = Math.min(3000, bulbs.length); bulbMesh.instanceMatrix.needsUpdate = true;
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  pools.forEach((p, i) => { if (i >= 3000) return; V3.set(p[0], .06, p[1]); S3.set(p[2], p[2], 1); M4.compose(V3, qx, S3); poolMesh.setMatrixAt(i, M4); });
  poolMesh.count = Math.min(3000, pools.length); poolMesh.instanceMatrix.needsUpdate = true;
  stash(bulbMesh); stash(poolMesh); halosApplied = -1;
}
let _upV; function _up(){ return _upV || (_upV = new THREE.Vector3(0, 1, 0)); }

/* ---------------- v7.2: desenhar só o que está na tela ----------------
   A cada quadro calcula a área do chão vista pela câmera (até a neblina). As malhas
   instanciadas (árvores, decoração, grama, cercas, meio-fios, luzes) guardam a lista
   completa e enviam à placa de vídeo só as instâncias dessa área, refeita quando a
   câmera sai da área já preparada. O terreno é desenhado só na faixa de linhas visível. */
const VIEW = {x0: 0, y0: 0, x1: 0, y1: 0};
const applied = {ok: false, x0: 0, y0: 0, x1: 0, y1: 0};
let halosApplied = -1, _vr, _vn, _vp;
function stash(im){
  const n = im.count;
  im.userData.all = {n, m: im.instanceMatrix.array.slice(0, n * 16), c: im.instanceColor ? im.instanceColor.array.slice(0, n * 3) : null};
  if (applied.ok) cullInst(im);
}
function cullInst(im){
  const a = im.userData.all; if (!a) return;
  const dm = im.instanceMatrix.array, dc = a.c ? im.instanceColor.array : null;
  const x0 = applied.x0, x1 = applied.x1, y0 = applied.y0, y1 = applied.y1;
  let k = 0;
  for (let i = 0; i < a.n; i++){
    const x = a.m[i * 16 + 12], z = a.m[i * 16 + 14];
    if (x < x0 || x > x1 || z < y0 || z > y1) continue;
    dm.set(a.m.subarray(i * 16, i * 16 + 16), k * 16);
    if (dc) dc.set(a.c.subarray(i * 3, i * 3 + 3), k * 3);
    k++;
  }
  im.count = k; im.instanceMatrix.needsUpdate = true;
  if (dc) im.instanceColor.needsUpdate = true;
}
const inView = (x, y, m) => x > applied.x0 - m && x < applied.x1 + m && y > applied.y0 - m && y < applied.y1 + m;
R3.viewInfo = () => ({view: Object.assign({}, VIEW), applied: Object.assign({}, applied)});
function computeView(){
  if (!_vr){ _vr = new THREE.Raycaster(); _vn = new THREE.Vector2(); _vp = new THREE.Vector3(); }
  camera.updateMatrixWorld();
  const far = scene.fog.far;
  let x0 = camera.position.x, x1 = x0, y0 = camera.position.z, y1 = y0;
  for (let i = 0; i < 9; i++){
    _vn.set(i % 3 - 1, ((i / 3) | 0) - 1); _vr.setFromCamera(_vn, camera);
    const o = _vr.ray.origin, d = _vr.ray.direction;
    const hd = Math.hypot(d.x, d.z) || 1e-6;
    let t = d.y < -1e-4 ? -o.y / d.y : Infinity;
    t = Math.min(t, far / hd);
    _vp.copy(d).multiplyScalar(t).add(o);
    x0 = Math.min(x0, _vp.x); x1 = Math.max(x1, _vp.x); y0 = Math.min(y0, _vp.z); y1 = Math.max(y1, _vp.z);
  }
  // margem para objetos altos (árvores, prédios) que entram na tela por baixo
  VIEW.x0 = Math.max(-2, x0 - 3); VIEW.x1 = Math.min(FP.W + 2, x1 + 3); VIEW.y0 = Math.max(-2, y0 - 3); VIEW.y1 = Math.min(FP.H + 2, y1 + 4);
}
function updateView(){
  computeView();
  const A = applied, V = VIEW;
  const inside = A.ok && V.x0 >= A.x0 && V.x1 <= A.x1 && V.y0 >= A.y0 && V.y1 <= A.y1;
  const tooBig = A.ok && (A.x1 - A.x0) * (A.y1 - A.y0) > 2.6 * Math.max(40, (V.x1 - V.x0) * (V.y1 - V.y0));
  if (!inside || tooBig){
    // prepara uma área um pouco maior, para não refazer a cada passo da câmera
    const mx = Math.max(4, (V.x1 - V.x0) * .18), my = Math.max(4, (V.y1 - V.y0) * .18);
    A.x0 = V.x0 - mx; A.x1 = V.x1 + mx; A.y0 = V.y0 - my; A.y1 = V.y1 + my; A.ok = true;
    [grassMesh, fenceMesh, postMesh, curbMesh, lineMesh, ownedLineMesh, bulbMesh, poolMesh].concat(decoMeshes).forEach(cullInst);
    halos.forEach(h => h.visible = inView(h.position.x, h.position.z, 0));
    halosApplied = halos.length;
    // terreno: só a faixa de linhas visível (o índice está organizado por linhas)
    const qw = (FP.W * SUB) * 6;
    const r0 = U.clamp(Math.floor(A.y0 * SUB), 0, FP.H * SUB), r1 = U.clamp(Math.ceil(A.y1 * SUB), 0, FP.H * SUB);
    terrainGeo.setDrawRange(r0 * qw, Math.max(0, r1 - r0) * qw);
  } else if (halosApplied !== halos.length){ halos.forEach(h => h.visible = inView(h.position.x, h.position.z, 0)); halosApplied = halos.length; }
}

/* ---------------- Instalações ---------------- */
function textTex(lines, w, h, bg, fg, border){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border){ g.strokeStyle = border; g.lineWidth = Math.max(4, h * .05); g.strokeRect(g.lineWidth * 1.5, g.lineWidth * 1.5, w - g.lineWidth * 3, h - g.lineWidth * 3); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(l => { g.font = `${l.b ? 800 : 600} ${l.s}px "Fredoka","Nunito","Segoe UI","Segoe UI Emoji",sans-serif`; g.fillText(l.t, w / 2, l.y !== undefined ? l.y : h / 2, w - 24); });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
}
function iconSprite(icon, cor){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.arc(64, 62, 52, 0, 7); g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = 7; g.strokeStyle = cor || '#1F6B4A'; g.stroke();
  g.font = '64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 64, 68);
  const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: tx, depthWrite: false}));
  s.scale.set(.75, .75, .75);
  return s;
}
const bldModels = new Map();
function buildingModel(type){
  if (!bldModels.has(type)) bldModels.set(type, makeBuilding(type));
  return bldModels.get(type).clone();
}
function makeBuilding(type){
  const S = M3.S, MB = M3.MB;
  const b = FP.BUILDINGS[type], w = b.w, d = b.h;
  const body = new MB(), win = new MB();
  let hgt = 1.2, icon = true;
  const wall = (x, y, z) => lerpC('#efe6d2', '#f8f1e2', M3.fbm(x * 6, y * 6, z * 6));
  const stone = (x, y, z) => lerpC('#8f8676', '#c4baa6', M3.fbm(x * 5, y * 5, z * 5) * 1.3);
  const wood = (x, y, z) => lerpC('#6a4426', '#9a6a3e', M3.fbm(x * 8, y * 22, z * 8) * 1.2);
  const roofCol = b.cor;
  const pitched = (bw, bd, y, cor) => {
    const rf = (x, yy, z) => lerpC(mulC(cor, .75), cor, M3.fbm(x * 12, yy * 4, z * 12) + (Math.sin(x * 26) > .7 ? -.15 : 0));
    const panel = S.rbox(bw + .3, .07, bd / 2 * 1.2 + .1, .03, 2);
    body.add(panel, {y: y + .2, z: bd * .27, rx: .62}, rf);
    body.add(panel, {y: y + .2, z: -bd * .27, rx: -.62}, rf);
    body.add(S.rbox(bw + .34, .09, .12, .04, 2), {y: y + .5}, mulC(cor, .7));
  };
  if (type === 'entrada'){
    hgt = 2.6;
    [-w / 2 + .45, w / 2 - .45].forEach(x => {
      body.add(S.rbox(.8, 2.4, .9, .06, 2), {x, z: -.2}, stone);
      body.add(S.rbox(.98, .16, 1.08, .05, 2), {x, y: 2.4, z: -.2}, '#1F6B4A');
      body.add(S.cone(.5, .55, 4), {x, y: 2.56, z: -.2, ry: Math.PI / 4}, '#1F6B4A');
      win.add(S.rbox(.36, .5, .03, .02, 1), {x, y: 1.1, z: .26});
      body.add(S.cyl(.02, .02, .7, 6), {x, y: 3.1, z: -.2}, '#555');
      body.add(S.rbox(.02, .2, .3, .005, 1), {x, y: 3.55, z: -.05}, x < 0 ? '#E8574B' : '#F2B33D');
    });
    body.add(S.rbox(w - .5, .6, .5, .08, 2), {y: 1.75, z: -.2}, '#F2B33D');
    body.add(S.rbox(w - 1.2, .22, .42, .06, 2), {y: 2.35, z: -.2}, '#e0a020');
    [-.55, .55].forEach(x => { body.add(S.rbox(.7, .9, .5, .05, 2), {x, z: .3}, wall); body.add(S.rbox(.85, .08, .65, .03, 2), {x, y: .9, z: .3}, '#E8574B'); win.add(S.rbox(.4, .3, .03, .02, 1), {x, y: .45, z: .56}); });
    icon = false;
  } else if (type === 'estacionamento'){
    body.add(S.rbox(w - .1, .04, d - .1, .02, 1), {}, (x, y, z) => lerpC('#454b51', '#5a6168', M3.fbm(x * 9, 0, z * 9)));
    for (let x = -w / 2 + .4; x < w / 2 - .2; x += .55){ body.add(S.rbox(.035, .01, .8, .005, 1), {x, y: .04, z: -d / 2 + .5}, '#f4f4f4'); body.add(S.rbox(.035, .01, .8, .005, 1), {x, y: .04, z: d / 2 - .5}, '#f4f4f4'); }
    const cores = ['#e8574b', '#2E8FB8', '#F2B33D', '#eeeeee', '#1F6B4A', '#7a4ab8'];
    let i = 0; for (let x = -w / 2 + .67; x < w / 2 - .3; x += .55, i++){ if (U.hash(i, 3) < .65) body.add(M3.carGeo(cores[i % 6]), {x, y: .04, z: -d / 2 + .5}); if (U.hash(i, 9) < .5) body.add(M3.carGeo(cores[(i + 2) % 6]), {x, y: .04, z: d / 2 - .5, ry: Math.PI}); }
    hgt = .4;
  } else if (type === 'banco'){
    for (let k = 0; k < 4; k++) body.add(S.rbox(.82, .025, .065, .012, 1), {y: .2, z: -.1 + k * .07}, wood);
    for (let k = 0; k < 2; k++) body.add(S.rbox(.82, .065, .025, .012, 1), {y: .27 + k * .09, z: -.15, rx: -.15}, wood);
    [-.35, .35].forEach(x => body.add(S.rbox(.04, .3, .3, .01, 1), {x, z: -.03}, '#2f3438'));
    hgt = .4; icon = false;
  } else if (type === 'lixeira'){
    body.add(S.lathe('bin', [[0, 0], [.15, 0], [.17, .44], [.16, .46], [0, .46]], 16), {}, '#3f5a46');
    body.add(S.lathe('binlid', [[0, 0], [.19, 0], [.17, .05], [.08, .09], [0, .1]], 16), {y: .45}, '#25362a');
    body.add(S.rbox(.12, .04, .02, .01, 1), {y: .3, z: .165}, '#7BC86C');
    hgt = .5; icon = false;
  } else if (type === 'bebidas' || type === 'sorvete'){
    body.add(S.rbox(.78, .75, .78, .06, 2), {}, wall); win.add(S.rbox(.5, .3, .03, .02, 1), {y: .35, z: .39});
    body.add(S.rbox(.92, .08, .5, .03, 2), {y: .78, z: .3, rx: .35}, (x) => Math.sin(x * 30) > 0 ? col('#ffffff') : col(b.cor));
    body.add(S.rbox(.9, .12, .9, .05, 2), {y: .75}, b.cor);
    if (type === 'sorvete'){ body.add(S.cone(.12, .35, 12), {y: .85, rx: Math.PI}, '#d8a860'); body.add(S.sphere(12, 8), {y: 1.22, s: .15}, '#f49ac1'); }
    hgt = 1.0;
  } else {
    hgt = {lanchonete: 1.1, restaurante: 1.5, banheiro: 1.0, loja: 1.25, info: 1.0, deposito: 1.3, clinica: 1.4, sala_func: 1.1, centro_pesq: 2.0}[type] || 1.2;
    const bw = w - .2, bd = d - .2;
    body.add(S.rbox(bw, hgt, bd, .06, 2), {}, type === 'deposito' ? wood : wall);
    body.add(S.rbox(bw + .06, .14, bd + .06, .04, 2), {}, stone);
    for (let x = -bw / 2 + .35; x < bw / 2 - .2; x += .45){ win.add(S.rbox(.26, hgt * .3, .03, .015, 1), {x, y: hgt * .4, z: bd / 2 + .01}); win.add(S.rbox(.26, hgt * .3, .03, .015, 1), {x, y: hgt * .4, z: -bd / 2 - .01}); body.add(S.rbox(.32, .04, .06, .015, 1), {x, y: hgt * .38, z: bd / 2 + .02}, '#ffffff'); }
    for (let z = -bd / 2 + .35; z < bd / 2 - .2; z += .45){ win.add(S.rbox(.03, hgt * .3, .26, .015, 1), {x: bw / 2 + .01, y: hgt * .4, z}); win.add(S.rbox(.03, hgt * .3, .26, .015, 1), {x: -bw / 2 - .01, y: hgt * .4, z}); }
    body.add(S.rbox(.36, hgt * .58, .05, .02, 1), {y: 0, z: bd / 2 + .01}, '#5a3a1f');
    if (type === 'centro_pesq'){
      body.add(S.rbox(bw + .14, .14, bd + .14, .05, 2), {y: hgt}, b.cor);
      const dome = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      win.add(dome, {y: hgt + .1, s: .7});
      body.add(S.cyl(.03, .03, .9, 8), {x: .9, y: hgt, z: .9}, '#888'); body.add(S.sphere(10, 8), {x: .9, y: hgt + .9, z: .9, s: .08}, '#E8574B');
    } else pitched(bw, bd, hgt, roofCol);
    if (type === 'lanchonete' || type === 'restaurante'){ body.add(S.rbox(bw * .9, .05, .45, .02, 2), {y: hgt * .7, z: bd / 2 + .2, rx: .35}, (x) => Math.sin(x * 25) > 0 ? col('#ffffff') : col(b.cor)); }
    if (type === 'restaurante'){ [-.7, .7].forEach(x => { body.add(S.cyl(.18, .18, .03, 16), {x, y: .32, z: bd / 2 + .6}, wood); body.add(S.cyl(.02, .02, .32, 6), {x, z: bd / 2 + .6}, '#555'); body.add(S.cyl(.02, .02, .55, 6), {x, y: .32, z: bd / 2 + .6}, '#ddd'); body.add(S.cone(.36, .18, 16), {x, y: .82, z: bd / 2 + .6}, '#E8574B'); }); }
    if (type === 'clinica'){ body.add(S.rbox(.2, .2, .05, .02, 1), {y: hgt * .8, z: bd / 2 + .03}, '#E8574B'); }
    if (type === 'deposito') body.add(S.rbox(bw * .5, hgt * .7, .04, .02, 1), {z: bd / 2 + .01}, '#5a3f26');
    hgt += .55;
  }
  const g1 = body.geo(), g2 = win.empty ? null : win.geo();
  const grp = new THREE.Group();
  const m1 = new THREE.Mesh(g1, matStd); m1.castShadow = true; m1.receiveShadow = true; grp.add(m1);
  if (g2){ const m2 = new THREE.Mesh(g2, matWin); m2.castShadow = false; grp.add(m2); }
  if (type === 'entrada'){
    const tex = textTex([{t: 'FAUNÓPOLIS', s: 74, b: true}], 640, 110, '#F2B33D', '#1E2A2F');
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w - .7, .46), PBR({map: tex, roughness: .6}));
    pl.position.set(0, 2.06, .06); grp.add(pl);
  }
  if (icon){ const s = iconSprite(b.icone, b.cor); s.position.set(0, hgt + .45, 0); grp.add(s); }
  return grp;
}
let bldSig = '';
function rebuildBuildings(G){
  while (bldGroup.children.length) bldGroup.remove(bldGroup.children[0]);
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'building') return;
    const m = buildingModel(o.type);
    m.position.set(o.x + o.w / 2, 0, o.y + o.h / 2);
    if (o.type === 'banco' || o.type === 'lixeira'){
      const dirs = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]];
      for (const [dx, dy, r] of dirs){ const nx = o.x + dx, ny = o.y + dy; if (U.inMap(nx, ny) && G.path[U.idx(nx, ny)]){ m.rotation.y = r; break; } }
    }
    m.userData.id = o.id;
    bldGroup.add(m);
  });
}

/* ---------------- Placas dos recintos ---------------- */
function rebuildSigns(G){
  while (signGroup.children.length) signGroup.remove(signGroup.children[0]);
  const S = M3.S;
  Object.values(G.enclosures).forEach(e => {
    if (!e.sign) return;
    const s = e.sign, sps = FP.World.encSpecies(G, e);
    const grp = new THREE.Group();
    const mb = new M3.MB();
    const wood = (x, y, z) => lerpC('#5a3a1f', '#8a5a33', M3.fbm(x * 8, y * 20, z * 8) * 1.2);
    mb.add(S.cyl(.045, .05, 1.3, 10), {x: -.46}, wood); mb.add(S.cyl(.045, .05, 1.3, 10), {x: .46}, wood);
    mb.add(S.rbox(1.08, .58, .07, .025, 2), {y: .78}, wood);
    mb.add(S.rbox(1.16, .07, .16, .03, 2), {y: 1.38}, '#4a2f18');
    const m = new THREE.Mesh(mb.geo(), matStd); m.castShadow = true; grp.add(m);
    const sub = sps.length ? sps.slice(0, 3).map(sp => FP.SPECIES[sp].nome).join(' · ') : 'vazio';
    const tex = textTex([{t: e.name, s: 50, b: true, y: 54}, {t: sub, s: 30, y: 116}], 440, 170, '#1F6B4A', '#FFF4DE', '#FFF4DE');
    const pm = PBR({map: tex, roughness: .7});
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(.98, .46), pm);
    pl.position.set(0, 1.07, .04); grp.add(pl);
    const back = pl.clone(); back.rotation.y = Math.PI; back.position.z = -.04; grp.add(back);
    grp.position.set(s.x + .5 + s.dx * .5, 0, s.y + .5 + s.dy * .5);
    grp.rotation.y = Math.atan2(s.dx, s.dy);
    signGroup.add(grp);
  });
}

/* ---------------- Animais (esculpidos, com membros animados) ---------------- */
const animalObjs = new Map();
function makeAnimalObj(model){
  const g = new THREE.Group();
  const body = new THREE.Mesh(model.body, matAnimal); body.castShadow = true; body.receiveShadow = true;
  const root = new THREE.Group(); root.add(body); g.add(root);
  const limbs = model.limbs.map(l => { const p = new THREE.Group(); p.position.set(l.x, l.y, l.z); const m = new THREE.Mesh(l.geo, matAnimal); m.castShadow = true; p.add(m); root.add(p); return {p, l}; });
  let wings = null;
  if (model.wings){
    const w = model.wings;
    const mk = (geo, s) => { const p = new THREE.Group(); p.position.set(w.x, w.y, s * w.z); const m = new THREE.Mesh(geo, matAnimal); m.castShadow = true; p.add(m); p.visible = false; root.add(p); return p; };
    wings = {L: mk(w.L, 1), R: mk(w.R, -1)};
  }
  return {g, root, limbs, wings, model};
}
function updateAnimals(G, dt){
  const seen = new Set(); let built = 0;
  G.animals.forEach(a => {
    if (a.quar) return;
    seen.add(a.id);
    if (!inView(a.x, a.y, 2)){ const oo = animalObjs.get(a.id); if (oo){ oo.g.visible = false; oo.x = a.x; oo.y = a.y; } return; }
    const sp = FP.SPECIES[a.sp];
    const sexKey = (sp.vis.juba || sp.vis.galhada) ? a.sex : 'X';
    let o = animalObjs.get(a.id);
    if (!o || o.key !== a.sp + sexKey){
      if (!M3.hasModel(a.sp, sexKey)){ if (built >= (Q().env ? 2 : 1)) return; built++; }
      if (o) animalGroup.remove(o.g);
      o = makeAnimalObj(M3.animalModel(a.sp, sexKey)); o.key = a.sp + sexKey; o.ph = Math.random() * 6;
      animalGroup.add(o.g); animalObjs.set(a.id, o);
      o.x = a.x; o.y = a.y; o.h = a.h;
    }
    const baby = FP.Animals.isBaby(a), sc = baby ? .6 : 1;
    // suaviza a posição (a simulação é discreta)
    o.x += (a.x - o.x) * Math.min(1, dt * 10); o.y += (a.y - o.y) * Math.min(1, dt * 10);
    let dh = -a.h - (o.hr === undefined ? -a.h : o.hr); dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    o.hr = (o.hr === undefined ? -a.h : o.hr + dh * Math.min(1, dt * 8));
    const inWater = G.ground[U.idx(Math.floor(a.x), Math.floor(a.y))] === FP.T.agua;
    const moving = a.state === 'wander' || a.state === 'toy';
    const playing = a.state === 'play', sleeping = a.state === 'sleep';
    const flying = sp.voa && moving && !inWater && o.model.wings;
    if (moving || playing) o.ph += dt * (playing ? 11 : 5.5 + sp.vel * 2.5);
    let y = inWater ? WATER_Y - o.model.legLen * sc * .85 - .03 : groundY(G, a.x, a.y);
    if (flying) y += .9 + Math.sin(clock * 3 + a.id) * .12;
    if (playing) y += Math.abs(Math.sin((a.playT || 0) * 6)) * .22 * sc;
    if (moving && !flying) y += Math.abs(Math.sin(o.ph)) * .012;
    o.g.visible = true;
    o.g.position.set(o.x, y, o.y);
    o.g.rotation.y = o.hr + (playing ? Math.sin((a.playT || 0) * 3) * .5 : 0);
    o.g.scale.set(sc, sc, sc);
    // pose
    const lie = sleeping && !sp.voa;
    o.root.position.y = lie ? -o.model.legLen * .78 : 0;
    o.root.rotation.z = o.model.waddle && moving ? Math.sin(o.ph) * .12 : 0;
    o.root.rotation.x = o.model.slide && moving ? Math.sin(o.ph) * .05 : 0;
    const breathe = 1 + Math.sin(clock * 2.2 + a.id) * .012;
    o.root.scale.set(1, breathe, 1);
    o.limbs.forEach(({p, l}) => {
      if (lie){ p.rotation.set(0, 0, l.x > 0 ? 1.35 : -1.35); return; }
      const sw = (moving || playing) && !flying ? Math.sin(o.ph + l.phase) * l.amp : (flying ? .9 : 0);
      if (l.axis === 'y') p.rotation.set(0, sw * .8, 0); else p.rotation.set(0, 0, l.arm ? -sw - .2 : sw);
    });
    if (o.wings){
      o.wings.L.visible = o.wings.R.visible = !!flying;
      if (flying){ const f = Math.sin(clock * 9 + a.id) * .65; o.wings.L.rotation.x = -f; o.wings.R.rotation.x = f; }
    }
  });
  animalObjs.forEach((o, id) => { if (!seen.has(id)){ animalGroup.remove(o.g); animalObjs.delete(id); } });
}

/* ---------------- Pessoas (instanciadas) ---------------- */
let PC, _q2, _ax, _sv, _qa, _lat;
const PANTS = ['#2f3a4f', '#3a3f4a', '#5a4632', '#2a2a2e', '#6a7a8a', '#3e5a3a'];
function updatePeople(G){
  if (!PC){ PC = new THREE.Color(); _q2 = new THREE.Quaternion(); _ax = _up(); _sv = new THREE.Vector3(); }
  mats();
  const list = [];
  const maxP = Q().people;
  G.staff.forEach(s => { if (inView(s.x, s.y, 1)) list.push([s.x, s.y, s.h, FP.STAFF[s.role].cor, '#e0ac85', '#3a2a1a', false, s.ft || 0, s.id || 7]); });
  for (const v of G.visitors){ if (list.length >= maxP) break; if (R3.mode === 'visitante' && v === follow.visitor) continue; if (inView(v.x, v.y, 1)) list.push([v.x, v.y, v.h, v.shirt, v.skin, v.hair, v.kid, v.ft, v.id || 0]); }
  const n = Math.min(list.length, pTorso.instanceMatrix.count);
  for (let i = 0; i < n; i++){
    const [x, y, h, shirt, skin, hair, kid, ft, id] = list[i];
    const s = kid ? .7 : 1, base = groundY(G, x, y);
    _q2.setFromAxisAngle(_ax, -h + Math.PI / 2);
    const sw = Math.sin(ft * Math.PI) * .5;
    const cos = Math.cos(h), sin = Math.sin(h);
    const qa = _qa || (_qa = new THREE.Quaternion()), lat = _lat || (_lat = new THREE.Vector3());
    lat.set(-sin, 0, cos);
    for (let k = 0; k < 2; k++){
      const side = k ? .045 : -.045, a = k ? sw : -sw;
      // pernas: giram em torno do quadril
      qa.setFromAxisAngle(lat, a).multiply(_q2);
      V3.set(x - sin * side * s, base + .23 * s, y + cos * side * s);
      S3.set(s, s, s); M4.compose(V3, qa, S3); pLeg.setMatrixAt(i * 2 + k, M4); pLeg.setColorAt(i * 2 + k, PC.set(PANTS[(id + 3) % PANTS.length]).convertSRGBToLinear());
      // braços
      qa.setFromAxisAngle(lat, -a * .8).multiply(_q2);
      const as = k ? .1 : -.1;
      V3.set(x - sin * as * s, base + .44 * s, y + cos * as * s);
      S3.set(s, s, s); M4.compose(V3, qa, S3); pArm.setMatrixAt(i * 2 + k, M4); pArm.setColorAt(i * 2 + k, PC.set(skin).convertSRGBToLinear());
    }
    S3.set(s, s, s);
    V3.set(x, base + .22 * s, y); M4.compose(V3, _q2, S3); pTorso.setMatrixAt(i, M4); pTorso.setColorAt(i, PC.set(shirt).convertSRGBToLinear());
    _sv.set(.075 * s, .082 * s, .075 * s);
    V3.set(x, base + .54 * s, y); M4.compose(V3, _q2, _sv); pHead.setMatrixAt(i, M4); pHead.setColorAt(i, PC.set(skin).convertSRGBToLinear());
    _sv.set(.08 * s, .07 * s, .08 * s);
    V3.set(x - cos * .008, base + .55 * s, y - sin * .008); M4.compose(V3, _q2, _sv); pHair.setMatrixAt(i, M4); pHair.setColorAt(i, PC.set(hair).convertSRGBToLinear());
  }
  pTorso.count = n; pHead.count = n; pHair.count = n; pLeg.count = n * 2; pArm.count = n * 2;
  [pTorso, pHead, pHair, pLeg, pArm].forEach(m => { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
}

/* ---------------- Carros na avenida ---------------- */
let cars = [];
function buildCars(){
  const cores = ['#e8574b', '#2E8FB8', '#F2B33D', '#eeeeee', '#1F6B4A', '#7a4ab8', '#333a40', '#f49ac1'];
  for (let i = 0; i < 12; i++){
    const m = new THREE.Mesh(M3.carGeo(cores[i % cores.length]), PBR({vertexColors: true, roughness: .25, metalness: .35, envMapIntensity: 1.2}));
    m.castShadow = true; m.scale.set(1.6, 1.6, 1.6);
    carGroup.add(m);
    cars.push({m, x: Math.random() * FP.W, dir: i % 2 ? 1 : -1, v: 3 + Math.random() * 3});
  }
}
function updateCars(dt){
  const y = FP.World.AVENUE_Y;
  cars.forEach(c => {
    c.x += c.dir * c.v * dt; if (c.x > FP.W + 3) c.x = -3; if (c.x < -3) c.x = FP.W + 3;
    c.m.position.set(c.x, .02, y + (c.dir > 0 ? 1.5 : .5));
    c.m.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  });
}

/* ---------------- Sobreposição (prévias de ferramentas) ---------------- */
let overlayWas = false;
R3.overlayBegin = function(need){
  if (!R3.ok) return null;
  if (!need){ if (overlayWas){ overlayMesh.visible = false; overlayWas = false; } return null; }
  const g = overlayCtx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  g.setTransform(OVS / T, 0, 0, OVS / T, 0, 0);
  overlayMesh.visible = true; overlayWas = true;
  return g;
};
R3.overlayEnd = function(used){ if (used) overlayTex.needsUpdate = true; };

/* ---------------- Dia e noite ---------------- */
function darkness(h){
  if (h >= 18.5 && h < 21) return (h - 18.5) / 2.5;
  if (h >= 21 || h < 5) return 1;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 0;
}
const SKY = {dayTop: '#3d84d8', dayHor: '#cfe4f2', duskTop: '#4a5a9a', duskHor: '#f6a86a', nightTop: '#050a1c', nightHor: '#1a2444'};
let _c1, _c2;
function updateLighting(G){
  if (!_c1){ _c1 = new THREE.Color(); _c2 = new THREE.Color(); }
  const hr = G.hour + (G.minute || 0) / 60;
  const d = darkness(hr);
  const dusk = Math.max(0, 1 - Math.abs(d - .45) * 2.6) * (d > 0 && d < 1 ? 1 : 0);
  _c1.set(SKY.dayTop).lerp(new THREE.Color(SKY.nightTop), d).lerp(new THREE.Color(SKY.duskTop), dusk * .4);
  _c2.set(SKY.dayHor).lerp(new THREE.Color(SKY.nightHor), d).lerp(new THREE.Color(SKY.duskHor), dusk * .7);
  skyUni.top.value.copy(_c1).convertSRGBToLinear(); skyUni.hor.value.copy(_c2).convertSRGBToLinear(); skyUni.bot.value.copy(skyUni.hor.value).multiplyScalar(.45);
  skyUni.night.value = d; skyUni.t.value = clock; skyUni.clouds.value = .5;
  scene.fog.color.copy(_c2).convertSRGBToLinear();
  // sol (de dia) / lua (à noite)
  const ang = ((hr - 6) / 12) * Math.PI;
  const sunUp = Math.max(.42, Math.sin(ang));
  const dir = new THREE.Vector3(Math.cos(ang) * .8, sunUp, .45).normalize();
  if (d >= .95) dir.set(-.4, .8, .3).normalize();
  skyUni.sunDir.value.copy(dir);
  skyUni.sunCol.value.setRGB(1, .93 - dusk * .25, .8 - dusk * .4).multiplyScalar(1 - d * .9);
  sun.intensity = 2.1 * (1 - d * .88);
  sun.color.setRGB(1, .94 - dusk * .22, .84 - dusk * .35);
  if (d > .9){ sun.color.setRGB(.55, .65, 1); sun.intensity = .32; }
  hemi.intensity = .6 * (1 - d * .75);
  hemi.color.setRGB(.81 - d * .4, .9 - d * .35, 1);
  const tx = C.tx, tz = C.ty;
  sun.position.set(tx + dir.x * 80, dir.y * 80, tz + dir.z * 80);
  sun.target.position.set(tx, 0, tz);
  const ext = U.clamp(C.dist * .9, 14, 80);
  const sc = sun.shadow.camera;
  if (sc.right !== ext){ sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 260; sc.updateProjectionMatrix(); }
  if (Q().env) updateEnv(Math.round(hr * 2) / 2);
  else hemi.intensity = 1.25 * (1 - d * .7);
  matGlow.color.setRGB(.6 + d * .5, .55 + d * .45, .42 + d * .3);
  matPool.opacity = d * .8; matHalo.opacity = d * .7;
  matWin.emissive.setRGB(d * .9, d * .7, d * .3);
  renderer.toneMappingExposure = .86 - d * .08;
}

/* ---------------- Quadro ---------------- */
let sigTimer = 0, encSig = '', signKey = '';
R3.draw = function(dt){
  if (!R3.ok) return;
  const G = FP.G;
  if (G !== lastG){ lastG = G; resetWorld(); }
  clock += dt; uTime.value = clock;
  perfSample(dt);
  sigTimer -= dt;
  if (sigTimer <= 0 || !prev.ground){
    sigTimer = .25;
    let os = 0, oc = 0; for (const k in G.objects){ os += +k; oc++; }
    const tChanged = updateTerrain(G, !prev.ground);
    const dsig = oc + ':' + os;
    if (dsig !== decoSig){ decoSig = dsig; rebuildDecos(G); rebuildBuildings(G); }
    let es = ''; for (const k in G.enclosures){ const e = G.enclosures[k]; es += k + ':' + e.tiles.length + ':' + e.minX + ':' + e.minY + ':' + e.maxX + ';'; }
    if (es !== encSig){ encSig = es; rebuildFences(G); }
    const gs = dsig + '|' + es;
    if (tChanged || gs !== grassSig){ grassSig = gs; rebuildGrass(G); }
    let sk = ''; for (const k in G.enclosures){ const e = G.enclosures[k]; sk += k + e.name + (e.sign ? e.sign.x + ',' + e.sign.y + ',' + e.sign.dx + ',' + e.sign.dy : '') + FP.World.encSpecies(G, e).join(',') + ';'; }
    if (sk !== signKey){ signKey = sk; rebuildSigns(G); }
  }
  if (Math.abs(FP.Cam.x - C.syncX) > .5 || Math.abs(FP.Cam.y - C.syncY) > .5){ C.tx = FP.Cam.x / T; C.ty = FP.Cam.y / T; }
  updateCameraMode(G, dt);
  const k = 1 - Math.pow(.0009, dt);
  C.yaw += (C.yawT - C.yaw) * k; C.pitch += (C.pitchT - C.pitch) * k; C.dist += (C.distT - C.dist) * k; C.fov += (C.fovT - C.fov) * k;
  if (R3.mode !== 'visitante'){
    const cp = Math.cos(C.pitch);
    camera.position.set(C.tx + Math.sin(C.yaw) * cp * C.dist, Math.sin(C.pitch) * C.dist + .4, C.ty + Math.cos(C.yaw) * cp * C.dist);
    camera.lookAt(C.tx, 0, C.ty);
  }
  if (Math.abs(camera.fov - C.fov) > .01) camera.fov = C.fov;
  camera.near = R3.mode === 'visitante' ? .04 : Math.max(.08, C.dist * .015); camera.far = 1500; camera.updateProjectionMatrix();
  const vq = Q().view;
  scene.fog.near = (R3.mode === 'visitante' ? 30 : C.dist * 2 + 25) * vq; scene.fog.far = (R3.mode === 'visitante' ? 160 : C.dist * 7 + 160) * vq;
  if (vq < 1){ camera.far = scene.fog.far + 30; camera.updateProjectionMatrix(); }
  updateView();
  skyMesh.position.copy(camera.position);
  FP.Cam.x = C.syncX = C.tx * T; FP.Cam.y = C.syncY = C.ty * T;
  // água em movimento
  waterNormal.offset.set(clock * .012, clock * .007);
  updateLighting(G);
  updateAnimals(G, dt);
  updatePeople(G);
  updateCars(dt);
  renderer.render(scene, camera);
};
function updateCameraMode(G, dt){
  if (R3.mode === 'seguir'){
    const sel = FP.UI.selected && FP.UI.selected.type === 'animal' ? G.animals.find(a => a.id === FP.UI.selected.id) : null;
    if (sel && sel !== follow.animal) follow.animal = sel;
    const a = follow.animal;
    if (!a || !G.animals.includes(a) || a.quar){ follow.animal = U.pick(G.animals.filter(x => !x.quar)) || null; if (!follow.animal){ R3.setMode('iso'); FP.UI.renderCamBar(); } return; }
    C.tx += (a.x - C.tx) * Math.min(1, dt * 3); C.ty += (a.y - C.ty) * Math.min(1, dt * 3);
    C.yawT += dt * .12;
  } else if (R3.mode === 'tour'){
    follow.tourT -= dt;
    const pts = Object.values(G.enclosures).map(e => [e.cx, e.cy]);
    Object.values(G.objects).forEach(o => { if (o.kind === 'building' && o.w >= 2) pts.push([o.x + o.w / 2, o.y + o.h / 2]); });
    if (follow.tourT <= 0 && pts.length){ follow.tourI = (follow.tourI + 1) % pts.length; follow.tourT = 9; C.distT = 10 + Math.random() * 12; C.pitchT = .3 + Math.random() * .4; }
    const p = pts[follow.tourI % Math.max(1, pts.length)];
    if (p){ C.tx += (p[0] - C.tx) * Math.min(1, dt * .6); C.ty += (p[1] - C.ty) * Math.min(1, dt * .6); }
    C.yawT += dt * .14;
  } else if (R3.mode === 'visitante'){
    let v = follow.visitor;
    if (!v || !G.visitors.includes(v) || v.state === 'out'){ v = follow.visitor = pickVisitor(); follow.look = null; if (!v){ R3.setMode('tour'); FP.UI.renderCamBar(); return; } }
    const eye = groundY(G, v.x, v.y) + (v.kid ? .42 : .56);
    if (!follow.look) follow.look = {x: Math.cos(v.h), y: Math.sin(v.h), px: v.x, py: v.y};
    const L = follow.look;
    let dx = Math.cos(v.h), dy = Math.sin(v.h);
    if (v.act && v.act.type === 'view' && G.enclosures[v.act.enc]){ const e = G.enclosures[v.act.enc]; const d = Math.hypot(e.cx - v.x, e.cy - v.y) || 1; dx = (e.cx - v.x) / d; dy = (e.cy - v.y) / d; }
    L.x += (dx - L.x) * Math.min(1, dt * 2.5); L.y += (dy - L.y) * Math.min(1, dt * 2.5);
    L.px += (v.x - L.px) * Math.min(1, dt * 6); L.py += (v.y - L.py) * Math.min(1, dt * 6);
    camera.position.set(L.px + L.x * .1, eye, L.py + L.y * .1);
    camera.lookAt(L.px + L.x * 6, eye - .3, L.py + L.y * 6);
    C.tx = v.x; C.ty = v.y; C.dist = C.distT = 6;
  }
}
})();
