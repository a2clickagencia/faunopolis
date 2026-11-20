/* =========================================================
   FAUNÓPOLIS — models3d.js  (v7.1)
   Gerador procedural de modelos 3D SUAVES (não low-poly):
   - Animais esculpidos por campos de distância (SDF) com
     união suave, malha extraída por "Surface Nets", normais
     pelo gradiente do campo e pelagem procedural (listras,
     manchas, rosetas, contra-sombreamento, ruído de pelos).
   - Vegetação orgânica (copas com ruído, troncos curvos,
     folhas de palmeira, pinheiros), rochas, brinquedos,
     instalações com cantos arredondados, pessoas e carros.
   Tudo em geometrias indexadas com cores por vértice.
   ========================================================= */
'use strict';
(function(){
const M3 = FP.M3 = {};
const U = FP.U, T = FP.TILE;

/* ---------------- Cores (espaço linear) ---------------- */
const colCache = new Map();
function col(hex){
  if (hex && hex.isColor) return hex;
  let c = colCache.get(hex);
  if (!c){ c = new THREE.Color(hex || '#ffffff').convertSRGBToLinear(); colCache.set(hex, c); }
  return c;
}
const lerpC = (a, b, t) => col(a).clone().lerp(col(b), U.clamp(t, 0, 1));
const mulC = (a, f) => col(a).clone().multiplyScalar(f);
M3.col = col; M3.lerpC = lerpC; M3.mulC = mulC;

/* ---------------- Ruído ---------------- */
function h3(x, y, z){ let n = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, z){
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a = h3(xi, yi, zi), b = h3(xi + 1, yi, zi), c = h3(xi, yi + 1, zi), d = h3(xi + 1, yi + 1, zi);
  const e = h3(xi, yi, zi + 1), f = h3(xi + 1, yi, zi + 1), g = h3(xi, yi + 1, zi + 1), h = h3(xi + 1, yi + 1, zi + 1);
  const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}
function fbm(x, y, z, oct){ let s = 0, a = .5, f = 1; for (let i = 0; i < (oct || 3); i++){ s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s; }
/* Voronoi 3D: distância ao ponto mais próximo (F1) e ao segundo (F2) */
function voro(x, y, z){
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let f1 = 9, f2 = 9;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++){
    const cx = xi + i, cy = yi + j, cz = zi + k;
    const px = cx + h3(cx, cy, cz), py = cy + h3(cx + 31, cy, cz), pz = cz + h3(cx, cy + 17, cz + 5);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d < f1){ f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [f1, f2];
}
M3.fbm = fbm; M3.vnoise = vnoise; M3.h3 = h3;

/* =========================================================
   CONSTRUTOR DE MALHAS (merge com transformação e cor)
   ========================================================= */
let _m4, _nm, _v, _n, _q, _e, _s;
function tmp(){ if (!_m4){ _m4 = new THREE.Matrix4(); _nm = new THREE.Matrix3(); _v = new THREE.Vector3(); _n = new THREE.Vector3(); _q = new THREE.Quaternion(); _e = new THREE.Euler(); _s = new THREE.Vector3(); } }
class MB {
  constructor(){ this.p = []; this.n = []; this.c = []; this.i = []; this.e = []; }
  /* geo: BufferGeometry; t: {x,y,z, rx,ry,rz, s | sx,sy,sz}; color: hex | Color | fn(wx,wy,wz,nx,ny,nz,lx,ly,lz) */
  add(geo, t, color, emissive){
    tmp(); t = t || {};
    _e.set(t.rx || 0, t.ry || 0, t.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _v.set(t.x || 0, t.y || 0, t.z || 0);
    const s = t.s || 1; _s.set(t.sx || s, t.sy || s, t.sz || s);
    _m4.compose(_v, _q, _s); _nm.getNormalMatrix(_m4);
    const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color;
    const base = this.p.length / 3, e = _m4.elements;
    const fn = typeof color === 'function' ? color : null, cc = fn ? null : (color === undefined ? null : col(color));
    for (let k = 0; k < P.count; k++){
      const lx = P.getX(k), ly = P.getY(k), lz = P.getZ(k);
      const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12], wy = e[1] * lx + e[5] * ly + e[9] * lz + e[13], wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
      this.p.push(wx, wy, wz);
      _n.set(N.getX(k), N.getY(k), N.getZ(k)).applyMatrix3(_nm).normalize();
      this.n.push(_n.x, _n.y, _n.z);
      let c;
      if (fn) c = fn(wx, wy, wz, _n.x, _n.y, _n.z, lx, ly, lz);
      else if (cc) c = cc;
      else if (C) { this.c.push(C.getX(k), C.getY(k), C.getZ(k)); this.e.push(emissive ? 1 : 0); continue; }
      else c = col('#ffffff');
      this.c.push(c.r, c.g, c.b); this.e.push(emissive ? 1 : 0);
    }
    if (geo.index){ const I = geo.index.array; for (let k = 0; k < I.length; k++) this.i.push(base + I[k]); }
    else for (let k = 0; k < P.count; k++) this.i.push(base + k);
    return this;
  }
  get empty(){ return !this.p.length; }
  geo(scale){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    if (scale) g.scale(scale, scale, scale);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
M3.MB = MB;

/* ---------------- Formas básicas ---------------- */
const shapeCache = new Map();
function cached(key, f){ let g = shapeCache.get(key); if (!g){ g = f(); shapeCache.set(key, g); } return g; }
/* une vértices coincidentes (para normais suaves em geometrias não indexadas) */
function weld(geo){
  const P = geo.attributes.position, map = new Map(), pos = [], idx = [];
  for (let k = 0; k < P.count; k++){
    const x = P.getX(k), y = P.getY(k), z = P.getZ(k);
    const key = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
    let j = map.get(key);
    if (j === undefined){ j = pos.length / 3; map.set(key, j); pos.push(x, y, z); }
    idx.push(j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const S = M3.S = {
  sphere: (ws, hs) => cached('sph' + ws + '_' + hs, () => new THREE.SphereGeometry(1, ws || 16, hs || 12)),
  /* bolha orgânica (copas, pedras, arbustos) */
  blob: (detail, amp, seed, freq, flat) => cached(`blob${detail}_${amp}_${seed}_${freq}_${flat}`, () => {
    const g = weld(new THREE.IcosahedronGeometry(1, detail));
    const P = g.attributes.position;
    for (let k = 0; k < P.count; k++){
      let x = P.getX(k), y = P.getY(k), z = P.getZ(k);
      const f = freq || 1.6;
      const d = 1 + (fbm(x * f + seed, y * f + seed * .7, z * f - seed, 3) - .5) * 2 * amp;
      x *= d; y *= d; z *= d;
      if (flat && y < 0) y *= flat;
      P.setXYZ(k, x, y, z);
    }
    g.computeVertexNormals(); return g;
  }),
  cyl: (rt, rb, h, seg, open) => cached(`cyl${rt}_${rb}_${h}_${seg}_${open}`, () => { const g = new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, !!open); g.translate(0, h / 2, 0); return g; }),
  cone: (r, h, seg) => cached(`cone${r}_${h}_${seg}`, () => { const g = new THREE.ConeGeometry(r, h, seg || 10); g.translate(0, h / 2, 0); return g; }),
  torus: (R, r, rs, ts) => cached(`tor${R}_${r}_${rs}_${ts}`, () => new THREE.TorusGeometry(R, r, rs || 10, ts || 24)),
  lathe: (key, prof, seg) => cached('lathe' + key, () => { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg || 16); g.computeVertexNormals(); return g; }),
  /* caixa com cantos arredondados */
  rbox: (w, h, d, r, seg) => cached(`rbox${w}_${h}_${d}_${r}_${seg}`, () => {
    seg = seg || 3;
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
    const P = g.attributes.position, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    const v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let k = 0; k < P.count; k++){
      v.set(P.getX(k), P.getY(k), P.getZ(k));
      c.set(U.clamp(v.x, -hw, hw), U.clamp(v.y, -hh, hh), U.clamp(v.z, -hd, hd));
      const dlt = v.clone().sub(c); if (dlt.lengthSq() > 1e-9) dlt.normalize().multiplyScalar(r);
      P.setXYZ(k, c.x + dlt.x, c.y + dlt.y, c.z + dlt.z);
    }
    const out = weld(g.toNonIndexed()); out.translate(0, h / 2, 0); return out;
  }),
  /* tubo ao longo de pontos com raio variável */
  tube: (key, pts, radii, seg, caps) => cached('tube' + key, () => tubeGeo(pts, radii, seg || 8, caps !== false)),
  quad: () => cached('quad', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })
};
function tubeGeo(pts, radii, seg, caps){
  const pos = [], idx = [], n = pts.length;
  const V = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  let prevN = null;
  const rings = [];
  for (let i = 0; i < n; i++){
    const t = (i < n - 1 ? V[i + 1].clone().sub(V[i]) : V[i].clone().sub(V[i - 1])).normalize();
    if (i > 0 && i < n - 1) t.add(V[i].clone().sub(V[i - 1]).normalize()).normalize();
    let nn = prevN ? prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t))).normalize() : (Math.abs(t.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).cross(t).normalize();
    prevN = nn;
    const b = t.clone().cross(nn).normalize();
    const r = Array.isArray(radii) ? radii[i] : radii;
    const ring = [];
    for (let s = 0; s < seg; s++){
      const a = s / seg * Math.PI * 2;
      const p = V[i].clone().addScaledVector(nn, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r);
      ring.push(pos.length / 3); pos.push(p.x, p.y, p.z);
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < seg; s++){
    const a = rings[i][s], b = rings[i][(s + 1) % seg], c = rings[i + 1][s], d = rings[i + 1][(s + 1) % seg];
    idx.push(a, c, b, b, c, d);
  }
  if (caps){
    [[0, -1], [n - 1, 1]].forEach(([i, dir]) => {
      const ci = pos.length / 3; pos.push(V[i].x, V[i].y, V[i].z);
      for (let s = 0; s < seg; s++){ const a = rings[i][s], b = rings[i][(s + 1) % seg]; if (dir < 0) idx.push(ci, a, b); else idx.push(ci, b, a); }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
M3.tubeGeo = tubeGeo;
const SH = S;

/* ---------------- Funções de cor ---------------- */
/* gradiente vertical + ruído (com oclusão na base) */
function gradFn(c1, c2, y0, y1, nAmp, nFreq){
  const a = col(c1), b = col(c2);
  return (x, y, z) => { const t = U.clamp((y - y0) / Math.max(.001, y1 - y0), 0, 1); const c = a.clone().lerp(b, t); const n = 1 + (fbm(x * (nFreq || 6), y * (nFreq || 6), z * (nFreq || 6), 2) - .5) * (nAmp || .25); return c.multiplyScalar(n); };
}
function noiseFn(c, amp, freq){ const a = col(c); return (x, y, z) => a.clone().multiplyScalar(1 + (fbm(x * (freq || 5), y * (freq || 5), z * (freq || 5), 2) - .5) * (amp || .3)); }
M3.gradFn = gradFn; M3.noiseFn = noiseFn;

/* =========================================================
   VEGETAÇÃO, DECORAÇÃO E BRINQUEDOS
   (1 unidade = 1 tile; base no y = 0)
   ========================================================= */
function foliage(mb, x, y, z, r, c1, c2, seed, opts){
  opts = opts || {};
  const g = S.blob(opts.detail || 3, opts.amp || .28, seed % 7, opts.freq || 1.7, opts.flat || .7);
  const a = col(c1), b = col(c2), dark = mulC(c1, .45);
  mb.add(g, {x, y, z, sx: r * (opts.sx || 1), sy: r * (opts.sy || .85), sz: r * (opts.sz || 1), ry: seed}, (wx, wy, wz, nx, ny, nz) => {
    const t = U.clamp((wy - (y - r * .8)) / (r * 1.6), 0, 1);
    const n = fbm(wx * 4.5 + seed, wy * 4.5, wz * 4.5, 3);
    const c = a.clone().lerp(b, U.clamp(t * .7 + n * .6 - .2, 0, 1));
    // oclusão: parte de baixo e voltada para dentro mais escura
    const ao = U.clamp(.55 + ny * .35 + t * .25, .35, 1.05);
    return c.lerp(dark, (1 - ao) * .6).multiplyScalar(.9 + n * .25);
  });
}
function trunk(mb, key, pts, radii, c1, c2){
  const g = S.tube(key, pts, radii, 9);
  mb.add(g, {}, (x, y, z) => { const n = fbm(x * 9, y * 22, z * 9, 2); return lerpC(c1, c2, n * 1.2 - .1).multiplyScalar(.85 + n * .3); });
}
function rock(mb, x, y, z, s, seed, c){
  mb.add(S.blob(2, .32, seed, 1.3, .35), {x, y: y + s * .25, z, sx: s * 1.2, sy: s * .8, sz: s, ry: seed}, (wx, wy, wz, nx, ny) => {
    const n = fbm(wx * 7 + seed, wy * 7, wz * 7, 3);
    return lerpC(c || '#9b988e', '#c9c5ba', n * .9 + ny * .25).multiplyScalar(.8 + n * .3);
  });
}
function grassClump(mb, x, z, h, c1, c2, n, seed){
  for (let i = 0; i < n; i++){
    const a = i / n * Math.PI * 2 + seed, r = .04 + h3(i, seed * 100 | 0, 3) * .1, hh = h * (.6 + h3(i, 7, seed * 100 | 0) * .6);
    mb.add(S.cone(.025, hh, 4), {x: x + Math.cos(a) * r, y: 0, z: z + Math.sin(a) * r, rx: Math.sin(a) * .35, rz: -Math.cos(a) * .35}, gradFn(mulC(c1, .6), c2, 0, hh, .1));
  }
}
function lampHead(mb, x, y, z){
  mb.add(S.lathe('lamphead', [[0, 0], [.12, .02], [.16, .1], [.13, .16], [.05, .2], [0, .22]], 14), {x, y, z}, '#2b3238');
}
M3.LIGHTS = {poste: [[0, 1.66, 0]], poste_duplo: [[-.4, 1.78, 0], [.4, 1.78, 0]], luminaria: [[0, .44, 0]], holofote: [[.18, 1.02, 0]]};

const decoCache = new Map();
M3.decoGeo = function(type, variant){
  const key = type + '_' + variant;
  if (decoCache.has(key)) return decoCache.get(key);
  const r = U.rng(type.length * 977 + variant * 131 + 7), R = () => r();
  const mb = new MB(), sd = variant * 3 + type.length;
  switch (type){
    case 'arbusto': for (let i = 0; i < 4; i++) foliage(mb, (R() - .5) * .35, .22 + R() * .12, (R() - .5) * .35, .22 + R() * .1, '#2f6f2c', '#6fb04f', sd + i, {detail: 2}); break;
    case 'capim': for (let i = 0; i < 4; i++) grassClump(mb, (R() - .5) * .6, (R() - .5) * .6, .55, '#8a7a2a', '#e0cc6a', 9, sd + i); break;
    case 'acacia': {
      trunk(mb, 'ac' + variant, [[0, 0, 0], [.04, .5, .02], [.1, 1.0, 0], [.18, 1.3, .05]], [.11, .08, .07, .05], '#5a3e24', '#8a6a45');
      trunk(mb, 'ac2' + variant, [[.05, .75, 0], [-.25, 1.15, .1], [-.45, 1.3, .15]], [.05, .04, .03], '#5a3e24', '#8a6a45');
      foliage(mb, .15, 1.45, 0, .85, '#4f6f22', '#9bb84a', sd, {sy: .28, flat: .5, amp: .22});
      foliage(mb, -.45, 1.38, .15, .45, '#4f6f22', '#9bb84a', sd + 1, {sy: .3, flat: .5});
      break; }
    case 'baoba':
      mb.add(S.lathe('baob', [[.0, 0], [.42, 0], [.36, .4], [.33, .9], [.36, 1.25], [.2, 1.4], [0, 1.42]], 14), {}, (x, y, z) => lerpC('#8f7e66', '#b3a288', fbm(x * 6, y * 10, z * 6, 2)));
      [[.5, 0], [-.45, .2], [.1, .5], [-.1, -.5]].forEach(([dx, dz], i) => { trunk(mb, 'bb' + i, [[0, 1.3, 0], [dx * .6, 1.6, dz * .6], [dx, 1.8, dz]], [.12, .07, .04], '#8f7e66', '#a8977d'); foliage(mb, dx * 1.1, 1.92, dz * 1.1, .32, '#5f7a2c', '#8fae48', sd + i, {detail: 2}); });
      break;
    case 'tropical': {
      const h = 1.1 + R() * .4;
      trunk(mb, 'tr' + variant, [[0, 0, 0], [.05, h * .5, 0], [-.03, h, .03]], [.12, .09, .07], '#4f3a24', '#7a5a3a');
      foliage(mb, 0, h + .25, 0, .7, '#1c5426', '#3f9440', sd, {sy: .7});
      foliage(mb, .35, h + .05, .2, .45, '#1c5426', '#3f9440', sd + 1);
      foliage(mb, -.3, h + .15, -.25, .45, '#1c5426', '#4aa049', sd + 2);
      foliage(mb, 0, h + .7, -.05, .42, '#2a6a2e', '#5bb055', sd + 3);
      break; }
    case 'palmeira': {
      const h = 1.85, bend = .25 + R() * .15;
      const pts = []; for (let i = 0; i <= 8; i++){ const t = i / 8; pts.push([Math.sin(t * 1.2) * bend, t * h, 0]); }
      const tg = S.tube('palm' + variant, pts, pts.map((p, i) => .1 - i * .005), 10);
      mb.add(tg, {}, (x, y, z) => { const ring = Math.sin(y * 38) * .5 + .5; return lerpC('#6a5032', '#9a7a52', ring * .7 + fbm(x * 10, y * 10, z * 10) * .4); });
      const top = pts[8];
      for (let i = 0; i < 9; i++){
        const a = i / 9 * Math.PI * 2 + R() * .3, len = .85 + R() * .2;
        const fr = []; for (let k = 0; k <= 6; k++){ const t = k / 6; fr.push([Math.cos(a) * t * len, -Math.pow(t, 1.7) * .55 + t * .2, Math.sin(a) * t * len]); }
        // folíolos: duas fileiras de lâminas ao longo da nervura
        const g = frondGeo(fr, .24);
        mb.add(g, {x: top[0], y: top[1], z: top[2]}, (x, y, z) => lerpC('#1f6a2a', '#5aa64a', fbm(x * 6, y * 6, z * 6) * 1.2));
      }
      for (let i = 0; i < 3; i++) mb.add(S.sphere(8, 6), {x: top[0] + (R() - .5) * .12, y: top[1] - .08, z: top[2] + (R() - .5) * .12, s: .06}, '#6a4a22');
      break; }
    case 'ipe':
      trunk(mb, 'ipe' + variant, [[0, 0, 0], [.03, .6, 0], [.08, 1.05, .03]], [.1, .08, .06], '#5a4028', '#86664a');
      foliage(mb, 0, 1.3, 0, .62, '#d99a10', '#ffe14a', sd, {sy: .75});
      foliage(mb, .35, 1.15, .2, .38, '#d99a10', '#ffe766', sd + 1);
      foliage(mb, -.3, 1.2, -.2, .38, '#d38f0c', '#ffdf40', sd + 2);
      break;
    case 'bromelia':
      for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; mb.add(S.cone(.05, .38, 5), {x: Math.cos(a) * .06, z: Math.sin(a) * .06, rx: Math.sin(a) * .9, rz: -Math.cos(a) * .9, sz: .35}, gradFn('#1f5a2a', '#5aa04a', 0, .3)); }
      mb.add(S.cone(.06, .3, 8), {y: .05}, gradFn('#c8102e', '#ff6a5a', .05, .35));
      break;
    case 'mangue':
      for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; trunk(mb, 'mg' + i, [[Math.cos(a) * .35, 0, Math.sin(a) * .35], [Math.cos(a) * .2, .35, Math.sin(a) * .2], [0, .55, 0]], [.035, .03, .04], '#4a3420', '#6a5030'); }
      trunk(mb, 'mgt', [[0, .5, 0], [0, 1.0, 0]], [.07, .05], '#4a3420', '#6a5030');
      foliage(mb, 0, 1.15, 0, .65, '#1f5a32', '#4a8f50', sd, {sy: .6});
      break;
    case 'aguape':
      for (let i = 0; i < 6; i++){ const x = (R() - .5) * .6, z = (R() - .5) * .6; mb.add(S.sphere(10, 6), {x, y: .01, z, sx: .14, sy: .04, sz: .14}, (x2, y, z2) => lerpC('#2a7a34', '#5cb85a', fbm(x2 * 9, y, z2 * 9))); }
      mb.add(S.sphere(8, 6), {x: .08, y: .08, z: -.06, s: .06}, '#b48bdc'); mb.add(S.sphere(8, 6), {x: .03, y: .1, z: -.1, s: .05}, '#d3b6f2');
      break;
    case 'cacto': {
      const rib = (x, y, z, nx, ny, nz, lx, ly, lz) => { const a = Math.atan2(lz, lx); const f = Math.cos(a * 10) * .5 + .5; return lerpC('#2f7a3a', '#5cae5a', f * .6 + fbm(x * 8, y * 8, z * 8) * .4); };
      mb.add(S.lathe('cact', [[0, 0], [.14, 0], [.15, .5], [.14, .85], [.09, 1.0], [0, 1.04]], 20), {}, rib);
      mb.add(S.lathe('cactA', [[0, 0], [.08, 0], [.085, .3], [.05, .4], [0, .42]], 16), {x: .26, y: .45}, rib);
      mb.add(S.tube('cactArm', [[.12, .4, 0], [.25, .42, 0], [.27, .5, 0]], .07, 10), {}, rib);
      mb.add(S.lathe('cactB', [[0, 0], [.07, 0], [.075, .25], [.045, .33], [0, .35]], 16), {x: -.24, y: .6}, rib);
      mb.add(S.tube('cactArm2', [[-.12, .55, 0], [-.22, .57, 0], [-.24, .63, 0]], .06, 10), {}, rib);
      mb.add(S.sphere(8, 6), {y: 1.04, s: .05}, '#f06aa0');
      break; }
    case 'arbusto_seco': for (let i = 0; i < 12; i++){ const a = R() * 6.28, l = .25 + R() * .25; trunk(mb, 'as' + i, [[0, 0, 0], [Math.cos(a) * l * .5, l * .7, Math.sin(a) * l * .5], [Math.cos(a) * l, l * 1.1, Math.sin(a) * l]], [.018, .012, .006], '#7a5a32', '#a88a5a'); } break;
    case 'bambu':
      for (let i = 0; i < 11; i++){
        const x = (R() - .5) * .7, z = (R() - .5) * .7, h = 1.4 + R() * 1.0;
        mb.add(S.cyl(.035, .04, h, 8, true), {x, z}, (wx, wy) => { const nd = (wy % .3) < .025; return nd ? col('#5a7a2a') : lerpC('#6fa040', '#a6cf62', U.hash(i, 3)); });
        for (let k = 0; k < 4; k++){ const a = R() * 6.28; mb.add(S.cone(.03, .32, 4), {x: x + Math.cos(a) * .12, y: h - k * .22, z: z + Math.sin(a) * .12, rx: Math.sin(a) * 1.3, rz: -Math.cos(a) * 1.3, sz: .25}, '#7fb84a'); }
      }
      break;
    case 'samambaia': for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + R() * .3; const fr = []; for (let k = 0; k <= 5; k++){ const t = k / 5; fr.push([Math.cos(a) * t * .45, .05 + Math.sin(t * 2.4) * .25, Math.sin(a) * t * .45]); } mb.add(frondGeo(fr, .1), {}, (x, y, z) => lerpC('#1f6a2a', '#5aae4a', fbm(x * 8, y * 8, z * 8) * 1.3)); } break;
    case 'pinheiro': {
      trunk(mb, 'pn', [[0, 0, 0], [0, .6, 0]], [.09, .07], '#4a3420', '#6a4a30');
      [[.35, .62, .62], [.75, .52, .55], [1.12, .4, .48], [1.45, .27, .4], [1.72, .14, .3]].forEach(([y, rr, hh], i) => {
        mb.add(S.blob(2, .18, i + 3, 2.4), {y: y + hh * .1, sx: rr, sy: hh * .5, sz: rr}, (x, yy, z, nx, ny) => {
          const snow = ny > .35 && fbm(x * 9, yy * 9, z * 9) > .38;
          return snow ? col('#f4fbff') : lerpC('#163f2a', '#2f7350', (yy - y) / hh + .3);
        });
        mb.add(S.cone(rr, hh, 14), {y}, (x, yy, z, nx, ny) => (ny > .5 && fbm(x * 9, yy * 9, z * 9) > .42) ? col('#f4fbff') : lerpC('#163f2a', '#2f7350', (yy - y) / hh));
      });
      break; }
    case 'arvore_mistica':
      trunk(mb, 'mis', [[0, 0, 0], [.1, .5, 0], [-.05, 1.0, .05], [.05, 1.3, 0]], [.13, .1, .08, .06], '#3a2a5a', '#6a4a8a');
      foliage(mb, 0, 1.45, 0, .75, '#4a2a8e', '#9a7ae8', sd, {sy: .75});
      foliage(mb, .4, 1.25, .2, .4, '#5a3aa0', '#b89aff', sd + 1);
      for (let i = 0; i < 10; i++) mb.add(S.sphere(8, 6), {x: (R() - .5) * 1.4, y: 1.0 + R() * 1.0, z: (R() - .5) * 1.4, s: .05}, R() < .5 ? '#ffe9a8' : '#a8f0ff', true);
      break;
    case 'cristal':
      [[0, 0, .16, 1.0, '#7fd8ff'], [-.2, .12, .11, .62, '#b48bff'], [.2, .08, .1, .56, '#9be7ff'], [.04, -.2, .09, .46, '#d6b8ff']].forEach(([x, z, w, h, c], i) => {
        mb.add(S.cone(w, h, 6), {x, z, rx: (i - 1.5) * .15, rz: (i - 1.5) * .12}, (wx, wy) => lerpC(c, '#ffffff', wy / h * .6), true);
      });
      rock(mb, 0, 0, 0, .25, 4, '#6a6a7a');
      break;
    case 'flores':
      mb.add(S.blob(2, .12, 3, 2, .2), {y: .02, sx: .42, sy: .07, sz: .42}, (x, y, z) => lerpC('#3a6a2a', '#6aa04a', fbm(x * 8, 0, z * 8)));
      for (let i = 0; i < 22; i++){ const x = (R() - .5) * .7, z = (R() - .5) * .7, c = ['#e8574b', '#f2b33d', '#f49ac1', '#ffffff', '#b48bdc', '#ff7a2a'][i % 6]; mb.add(S.cyl(.008, .01, .14, 4), {x, z}, '#3a7a2a'); mb.add(S.sphere(8, 6), {x, y: .15, z, sx: .05, sy: .03, sz: .05}, c); mb.add(S.sphere(6, 4), {x, y: .17, z, s: .018}, '#ffd23f'); }
      break;
    case 'pedra': rock(mb, 0, 0, 0, .38, variant + 2); rock(mb, .25, 0, .2, .2, variant + 5); rock(mb, -.22, 0, -.15, .16, variant + 9); break;
    case 'tronco': {
      const lg = S.cyl(.15, .15, .95, 14);
      mb.add(lg, {x: -.47, y: .15, rz: -Math.PI / 2, ry: .5}, (x, y, z, nx, ny, nz, lx, ly) => (ly < .01 || ly > .94) ? lerpC('#c99a62', '#8a6038', Math.sin(Math.hypot(x, z) * 60) * .5 + .5) : lerpC('#4a3220', '#7a5636', fbm(x * 14, y * 30, z * 14) * 1.2));
      grassClump(mb, .3, .25, .2, '#3a6a2a', '#7ab84a', 6, 3);
      break; }
    case 'abrigo': {
      const wood = (x, y, z) => { const ring = Math.sin(y * 50) * .5 + .5; return lerpC('#6a4426', '#9a6a3e', ring * .5 + fbm(x * 8, y * 8, z * 8) * .5); };
      mb.add(S.rbox(.85, .55, .8, .04, 2), {}, wood);
      mb.add(S.rbox(.3, .4, .05, .02, 2), {z: .4}, '#24160a');
      const roof = S.rbox(1.05, .06, .6, .025, 2);
      const thatch = (x, y, z) => lerpC('#8a6a2a', '#d8b860', fbm(x * 20, y * 8, z * 4) * 1.2);
      mb.add(roof, {y: .72, z: .22, rx: .62}, thatch); mb.add(roof, {y: .72, z: -.22, rx: -.62}, thatch);
      break; }
    case 'bebedouro':
      mb.add(S.rbox(.78, .26, .42, .05, 2), {}, '#8f9399');
      mb.add(S.rbox(.66, .02, .3, .01, 1), {y: .21}, '#3f9fd8');
      break;
    case 'escalada': {
      const wood = (x, y, z) => lerpC('#6a4426', '#a0744a', fbm(x * 8, y * 18, z * 8) * 1.2);
      [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]].forEach(([x, z]) => mb.add(S.cyl(.045, .055, 1.25, 10), {x, z}, wood));
      mb.add(S.rbox(.85, .06, .85, .02, 2), {y: .7}, wood);
      mb.add(S.cyl(.035, .035, .85, 8), {x: -.42, y: 1.2, rz: -Math.PI / 2}, wood);
      const rope = []; for (let i = 0; i <= 8; i++) rope.push([0, 1.2 - i * .1, .35 + Math.sin(i * .5) * .03]);
      mb.add(S.tube('rope1', rope, .015, 6), {}, '#d8b878');
      break; }
    case 'cupinzeiro': mb.add(S.lathe('cupim', [[0, 0], [.32, 0], [.26, .25], [.18, .55], [.12, .8], [.05, .95], [0, .98]], 16), {}, (x, y, z) => lerpC('#8a5a2a', '#c8925a', fbm(x * 10, y * 10, z * 10) * 1.3)); break;
    case 'gelo_bloco': mb.add(S.blob(1, .1, 2, 1.5), {y: .28, sx: .38, sy: .3, sz: .36}, (x, y, z, nx, ny) => lerpC('#9fd8f0', '#ffffff', ny * .5 + .5)); mb.add(S.blob(1, .1, 5, 1.5), {x: .1, y: .62, z: -.05, s: .2}, '#e6f8ff'); break;
    case 'estatua': {
      mb.add(S.rbox(.8, .35, .8, .05, 2), {}, (x, y, z) => lerpC('#a8a396', '#cdc8bb', fbm(x * 10, y * 10, z * 10)));
      const st = M3.statueGeo('leao');
      if (st) mb.add(st, {y: .35, s: .9, ry: Math.PI * .25}, (x, y, z) => lerpC('#9a958a', '#d6d1c4', fbm(x * 10, y * 10, z * 10) + .1));
      break; }
    case 'fonte':
      mb.add(S.lathe('fonteB', [[0, 0], [.72, 0], [.75, .25], [.68, .28], [.62, .1], [0, .1]], 28), {}, (x, y, z) => lerpC('#b9b3a5', '#ded8ca', fbm(x * 8, y * 8, z * 8)));
      mb.add(S.lathe('fonteC', [[0, 0], [.1, 0], [.08, .5], [.3, .55], [.32, .62], [.05, .62], [.04, .8], [0, .8]], 20), {}, '#d8d3c7');
      mb.add(S.cyl(.66, .66, .02, 28), {y: .17}, '#4aa3d8');
      mb.add(S.cyl(.27, .27, .02, 20), {y: .6}, '#6ab8e8');
      break;
    case 'poste':
      mb.add(S.lathe('posteBase', [[0, 0], [.1, 0], [.09, .06], [.05, .1], [0, .1]], 12), {}, '#2b3238');
      mb.add(S.cyl(.032, .04, 1.62, 10), {}, '#2b3238');
      lampHead(mb, 0, 1.52, 0);
      break;
    case 'poste_duplo':
      mb.add(S.lathe('posteBase2', [[0, 0], [.12, 0], [.1, .07], [.06, .12], [0, .12]], 12), {}, '#2b3238');
      mb.add(S.cyl(.036, .045, 1.72, 10), {}, '#2b3238');
      mb.add(S.tube('pdArm', [[-.4, 1.72, 0], [-.2, 1.76, 0], [0, 1.72, 0], [.2, 1.76, 0], [.4, 1.72, 0]], .022, 6), {}, '#2b3238');
      [-.4, .4].forEach(x => lampHead(mb, x, 1.62, 0));
      break;
    case 'luminaria': mb.add(S.cyl(.03, .04, .38, 8), {}, '#3b4a40'); mb.add(S.lathe('lumi', [[0, 0], [.09, 0], [.1, .06], [.03, .1], [0, .1]], 12), {y: .46}, '#3b4a40'); break;
    case 'holofote':
      mb.add(S.cyl(.035, .045, .95, 8), {}, '#3a3f45');
      mb.add(S.lathe('holo', [[0, 0], [.09, 0], [.13, .16], [0, .16]], 14), {x: .02, y: .98, rz: -1.2}, '#3a3f45');
      break;
    case 'placa':
      mb.add(S.cyl(.03, .03, .58, 8), {x: -.26}, '#6b4320'); mb.add(S.cyl(.03, .03, .58, 8), {x: .26}, '#6b4320');
      mb.add(S.rbox(.72, .4, .05, .02, 2), {y: .3}, '#7a5230');
      mb.add(S.rbox(.62, .3, .02, .01, 1), {y: .35, z: .03}, '#FFF4DE');
      mb.add(S.rbox(.36, .03, .01, .005, 1), {x: -.08, y: .56, z: .045}, '#1F6B4A'); mb.add(S.rbox(.46, .03, .01, .005, 1), {y: .48, z: .045}, '#1F6B4A'); mb.add(S.rbox(.4, .03, .01, .005, 1), {x: -.03, y: .41, z: .045}, '#1F6B4A');
      break;
    /* ---------------- BRINQUEDOS (v7.1) ---------------- */
    case 'bola':
      mb.add(S.sphere(24, 16), {y: .2, s: .2}, (x, y, z, nx, ny, nz) => { const a = Math.atan2(nz, nx); const k = Math.floor((a + Math.PI) / (Math.PI / 3)); return col(['#e8574b', '#f2b33d', '#2E8FB8', '#e8574b', '#f2b33d', '#2E8FB8'][k % 6]); });
      break;
    case 'caixa_petiscos':
      mb.add(S.rbox(.42, .32, .42, .035, 2), {}, (x, y, z) => lerpC('#b98a4a', '#d8ac6a', fbm(x * 12, y * 3, z * 12) * 1.3));
      [[0, .2, .212, 0], [.1, .1, .212, 0], [-.1, .14, .212, 0]].forEach(([x, y, z]) => mb.add(S.cyl(.035, .035, .01, 12), {x, y, z, rx: Math.PI / 2}, '#3a2412'));
      mb.add(S.sphere(8, 6), {x: .05, y: .34, z: .05, s: .05}, '#e8574b'); mb.add(S.sphere(8, 6), {x: -.08, y: .33, z: -.02, s: .04}, '#7BC86C');
      break;
    case 'pneu': {
      const wood = (x, y, z) => lerpC('#6a4426', '#9a6a3e', fbm(x * 8, y * 18, z * 8) * 1.2);
      mb.add(S.cyl(.045, .055, 1.25, 10), {x: -.38}, wood); mb.add(S.cyl(.045, .055, 1.25, 10), {x: .38}, wood);
      mb.add(S.cyl(.04, .04, .86, 10), {x: -.43, y: 1.2, rz: -Math.PI / 2}, wood);
      [-.12, .12].forEach(x => mb.add(S.tube('pnr' + x, [[x, 1.2, 0], [x * .8, .85, 0], [x * .9, .62, 0]], .012, 5), {}, '#d8b878'));
      mb.add(S.torus(.18, .07, 12, 24), {y: .55, rx: Math.PI / 2 + .3}, (x, y, z) => lerpC('#151517', '#3a3a40', fbm(x * 30, y * 30, z * 30)));
      break; }
    case 'arranhador':
      mb.add(S.cyl(.13, .15, .9, 14), {}, (x, y, z) => { const band = Math.sin(y * 70) * .5 + .5; return y > .2 && y < .7 ? lerpC('#b8955a', '#e0c890', band) : lerpC('#4a3220', '#7a5636', fbm(x * 14, y * 30, z * 14) * 1.2); });
      mb.add(S.rbox(.5, .05, .5, .02, 2), {}, '#7a5636'); mb.add(S.rbox(.42, .05, .42, .02, 2), {y: .9}, '#7a5636');
      break;
    case 'escova':
      mb.add(S.cyl(.05, .06, .9, 10), {x: -.3}, '#555b62'); mb.add(S.cyl(.05, .06, .9, 10), {x: .3}, '#555b62');
      mb.add(S.rbox(.7, .1, .14, .03, 2), {y: .55}, '#6b4320');
      mb.add(S.rbox(.66, .2, .2, .05, 2), {y: .35}, (x, y, z) => lerpC('#c9a040', '#f0d070', fbm(x * 40, y * 5, z * 40) * 1.3));
      break;
    case 'quebra_cabeca':
      mb.add(S.lathe('qb', [[0, 0], [.3, 0], [.33, .06], [.3, .14], [0, .14]], 24), {}, '#2E8FB8');
      for (let i = 0; i < 7; i++){ const a = i / 7 * 6.28; mb.add(S.cyl(.045, .045, .02, 12), {x: Math.cos(a) * .2, y: .14, z: Math.sin(a) * .2}, '#123e55'); }
      mb.add(S.sphere(12, 8), {y: .17, s: .07}, '#F2B33D');
      break;
    case 'rede_cordas': {
      const wood = (x, y, z) => lerpC('#6a4426', '#9a6a3e', fbm(x * 8, y * 18, z * 8) * 1.2);
      [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]].forEach(([x, z]) => mb.add(S.cyl(.045, .05, 1.1, 10), {x, z}, wood));
      for (let k = -2; k <= 2; k++){
        const a = [], b = [];
        for (let i = 0; i <= 8; i++){ const t = i / 8 - .5, sag = (1 - 4 * t * t) * .18; a.push([t * .8, .95 - sag, k * .18]); b.push([k * .18, .95 - sag, t * .8]); }
        mb.add(S.tube('rnA' + k, a, .012, 5), {}, '#d8b878'); mb.add(S.tube('rnB' + k, b, .012, 5), {}, '#d8b878');
      }
      break; }
    case 'poleiro': {
      const wood = (x, y, z) => lerpC('#5a3a22', '#8a6040', fbm(x * 8, y * 18, z * 8) * 1.2);
      trunk(mb, 'pol1', [[-.35, 0, 0], [-.33, .5, 0], [-.35, 1.0, 0]], [.05, .045, .04], '#5a3a22', '#8a6040');
      trunk(mb, 'pol2', [[.35, 0, 0], [.36, .5, 0], [.33, 1.0, 0]], [.05, .045, .04], '#5a3a22', '#8a6040');
      trunk(mb, 'pol3', [[-.4, .95, 0], [0, 1.0, .02], [.4, .95, 0]], [.035, .04, .035], '#5a3a22', '#8a6040');
      [-.15, .15].forEach(x => mb.add(S.cyl(.008, .008, .35, 4), {x, y: .6}, '#d8b878'));
      mb.add(S.cyl(.02, .02, .36, 8), {x: -.18, y: .6, rz: -Math.PI / 2}, wood);
      mb.add(S.sphere(10, 8), {x: .25, y: .3, s: .07}, '#e8574b');
      break; }
    case 'boia':
      mb.add(S.torus(.2, .07, 12, 28), {y: .02, rx: Math.PI / 2}, (x, y, z) => { const a = Math.atan2(z, x); return Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 ? col('#e8574b') : col('#f8f8f8'); });
      mb.add(S.sphere(12, 8), {x: .3, y: .04, z: .1, s: .08}, '#f2b33d');
      break;
    default: rock(mb, 0, 0, 0, .3, 3);
  }
  const g = mb.geo();
  decoCache.set(key, g);
  return g;
};
/* folha composta (palmeira / samambaia): nervura + folíolos */
function frondGeo(spine, w){
  const pos = [], idx = [];
  const add = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  for (let k = 0; k < spine.length - 1; k++){
    const a = spine[k], b = spine[k + 1];
    const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
    const sx = -dz / L, sz = dx / L, t = k / (spine.length - 1), ww = w * Math.sin(Math.PI * (t * .85 + .12));
    for (const side of [-1, 1]){
      const i0 = add(a[0], a[1], a[2]), i1 = add(b[0], b[1], b[2]);
      const i2 = add((a[0] + b[0]) / 2 + sx * ww * side, (a[1] + b[1]) / 2 - ww * .45, (a[2] + b[2]) / 2 + sz * ww * side);
      if (side > 0) idx.push(i0, i2, i1, i0, i1, i2); else idx.push(i0, i1, i2, i0, i2, i1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // normais apontando mais para cima (iluminação macia de folhagem)
  const N = g.attributes.normal; for (let k = 0; k < N.count; k++){ N.setY(k, Math.abs(N.getY(k)) + .6); }
  const v = new THREE.Vector3(); for (let k = 0; k < N.count; k++){ v.set(N.getX(k), N.getY(k), N.getZ(k)).normalize(); N.setXYZ(k, v.x, v.y, v.z); }
  return g;
}

/* =========================================================
   ANIMAIS — escultura por campos de distância (SDF)
   Unidades: "pixels de sprite" (1 tile = 32). Eixo +X = frente,
   +Y = cima, Z = lados. Escalado para tiles no final.
   ========================================================= */
function smin(a, b, k){ if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }
class SDF {
  constructor(){ this.P = []; this.extra = new MB(); }
  // elipsoide
  e(c, r, color, o){ this.P.push(Object.assign({t: 0, c, r, color, k: 1.6}, o || {})); return this; }
  // cone arredondado (cápsula com raios diferentes)
  c(a, b, ra, rb, color, o){ const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; this.P.push(Object.assign({t: 1, a, b, ra, rb, ba, bb: ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2] || 1e-6, color, k: 1.6}, o || {})); return this; }
  // corrente de cones por uma lista de pontos
  chain(pts, radii, color, o){ for (let i = 0; i < pts.length - 1; i++) this.c(pts[i], pts[i + 1], radii[i], radii[i + 1], color, o); return this; }
  d1(P, x, y, z){
    let d;
    if (P.t === 0){
      const px = (x - P.c[0]) / P.r[0], py = (y - P.c[1]) / P.r[1], pz = (z - P.c[2]) / P.r[2];
      const k0 = Math.sqrt(px * px + py * py + pz * pz);
      const qx = px / P.r[0], qy = py / P.r[1], qz = pz / P.r[2];
      const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-6;
      d = k0 * (k0 - 1) / k1;
    } else {
      const pax = x - P.a[0], pay = y - P.a[1], paz = z - P.a[2];
      const h = U.clamp((pax * P.ba[0] + pay * P.ba[1] + paz * P.ba[2]) / P.bb, 0, 1);
      d = Math.hypot(pax - P.ba[0] * h, pay - P.ba[1] * h, paz - P.ba[2] * h) - (P.ra + (P.rb - P.ra) * h);
    }
    if (P.rough) d += (vnoise(x * P.rf + 3, y * P.rf, z * P.rf) - .5) * P.rough;
    return d;
  }
  dist(x, y, z){
    let d = 1e9;
    for (let i = 0; i < this.P.length; i++){ const P = this.P[i]; d = smin(d, this.d1(P, x, y, z), P.k); }
    return d;
  }
  colorAt(x, y, z){
    let best = 1e9, wsum = 0; const out = new THREE.Color(0, 0, 0);
    const ds = this.P.map(P => this.d1(P, x, y, z));
    for (const d of ds) if (d < best) best = d;
    for (let i = 0; i < this.P.length; i++){
      const P = this.P[i]; const w = Math.exp(-(ds[i] - best) * (P.sharp || 3.2));
      if (w < .02) continue;
      const c = typeof P.color === 'function' ? P.color(x, y, z) : col(P.color);
      out.r += c.r * w; out.g += c.g * w; out.b += c.b * w; wsum += w;
    }
    return out.multiplyScalar(1 / Math.max(1e-6, wsum));
  }
  bounds(){
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    const ext = (c, r) => { for (let i = 0; i < 3; i++){ mn[i] = Math.min(mn[i], c[i] - r[i]); mx[i] = Math.max(mx[i], c[i] + r[i]); } };
    this.P.forEach(P => { if (P.t === 0) ext(P.c, P.r); else { const r = Math.max(P.ra, P.rb); ext(P.a, [r, r, r]); ext(P.b, [r, r, r]); } });
    return [mn, mx];
  }
  /* Surface Nets: extrai uma malha suave do campo de distância */
  mesh(res){
    const [mn, mx] = this.bounds();
    const size = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    const h = size / (res || 56), pad = 2.5 * h;
    for (let i = 0; i < 3; i++){ mn[i] -= pad; mx[i] += pad; }
    const nx = Math.ceil((mx[0] - mn[0]) / h), ny = Math.ceil((mx[1] - mn[1]) / h), nz = Math.ceil((mx[2] - mn[2]) / h);
    const sx = nx + 1, sy = ny + 1, F = new Float32Array(sx * sy * (nz + 1));
    for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[i + sx * (j + sy * k)] = this.dist(mn[0] + i * h, mn[1] + j * h, mn[2] + k * h);
    const vid = new Int32Array(nx * ny * nz).fill(-1);
    const pos = [], idx = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const v8 = new Float32Array(8);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
      let mask = 0;
      for (let c = 0; c < 8; c++){ const v = F[(i + co[c][0]) + sx * ((j + co[c][1]) + sy * (k + co[c][2]))]; v8[c] = v; if (v < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let ax = 0, ay = 0, az = 0, n = 0;
      for (const [a, b] of E){
        const va = v8[a], vb = v8[b];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        ax += co[a][0] + (co[b][0] - co[a][0]) * t; ay += co[a][1] + (co[b][1] - co[a][1]) * t; az += co[a][2] + (co[b][2] - co[a][2]) * t; n++;
      }
      vid[i + nx * (j + ny * k)] = pos.length / 3;
      pos.push(mn[0] + (i + ax / n) * h, mn[1] + (j + ay / n) * h, mn[2] + (k + az / n) * h);
    }
    const V = (i, j, k) => vid[i + nx * (j + ny * k)];
    const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
    for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++){ // arestas em X
      const a = F[i + sx * (j + sy * k)] < 0, b = F[i + 1 + sx * (j + sy * k)] < 0; if (a === b) continue;
      quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), !a);
    }
    for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++){ // arestas em Y
      const a = F[i + sx * (j + sy * k)] < 0, b = F[i + sx * (j + 1 + sy * k)] < 0; if (a === b) continue;
      quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), !a);
    }
    for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++){ // arestas em Z
      const a = F[i + sx * (j + sy * k)] < 0, b = F[i + sx * (j + sy * (k + 1))] < 0; if (a === b) continue;
      quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), !a);
    }
    // projeta os vértices na superfície e calcula normais pelo gradiente
    const nor = new Float32Array(pos.length), cols = new Float32Array(pos.length), e = h * .5;
    for (let q = 0; q < pos.length; q += 3){
      let x = pos[q], y = pos[q + 1], z = pos[q + 2];
      for (let it = 0; it < 2; it++){
        const d = this.dist(x, y, z);
        const gx = this.dist(x + e, y, z) - this.dist(x - e, y, z), gy = this.dist(x, y + e, z) - this.dist(x, y - e, z), gz = this.dist(x, y, z + e) - this.dist(x, y, z - e);
        const gl = Math.hypot(gx, gy, gz) || 1;
        if (it === 0){ x -= d * gx / gl; y -= d * gy / gl; z -= d * gz / gl; }
        else { nor[q] = gx / gl; nor[q + 1] = gy / gl; nor[q + 2] = gz / gl; }
      }
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z;
      const c = this.colorAt(x, y, z);
      // contra-sombreamento leve + variação de pelagem
      const fur = 1 + (fbm(x * .9, y * .9, z * .9, 2) - .5) * .16 + (vnoise(x * 3.1, y * 3.1, z * 3.1) - .5) * .08;
      c.multiplyScalar(fur);
      cols[q] = c.r; cols[q + 1] = c.g; cols[q + 2] = c.b;
    }
    const mb = new MB();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx);
    mb.add(g);
    if (!this.extra.empty){ const eg = this.extra.geo(); mb.add(eg); }
    return mb.geo(1 / T * 1.12);
  }
}
M3.SDF = SDF;

/* ---------- Pelagens ---------- */
function furPattern(v, by, bh, L, Wd, part){
  const c1 = col(v.cor), c2 = v.cor2 ? col(v.cor2) : mulC(v.cor, .7);
  const belly = lerpC(v.cor, '#fff6e6', .35);
  const cy = by + bh * .5;
  return (x, y, z) => {
    let c = c1;
    switch (v.padrao){
      case 'listras': {
        const zebra = (v.cor === '#f4f4f2' || v.cor2 === '#222');
        const s = Math.sin(x * (zebra ? 1.05 : .9) + Math.sin(y * .35) * 1.4 + fbm(x * .25, y * .25, z * .25) * 3 + (part === 'leg' ? y * 1.1 : 0));
        if (s > (zebra ? .1 : .5) && (zebra || y > cy - bh * .2 || part === 'leg')) c = c2;
        else if (!zebra && y < cy - bh * .25 && part !== 'leg') c = lerpC(v.cor, '#fbf3e6', .8);
        break; }
      case 'manchas': {
        const long = (v.pescoco || 0) > 12;
        const [f1, f2] = voro(x / (long ? 3.1 : 2.6), y / (long ? 3.1 : 2.6), z / (long ? 3.1 : 2.6));
        if (long){ c = (f2 - f1) < .16 ? lerpC(v.cor, '#fff4dc', .3) : c2; if (y < by + 1 && part === 'leg') c = lerpC(v.cor, '#fff4dc', .4); }
        else if (f1 < .38) c = c2;
        break; }
      case 'rosetas': {
        const [f1, f2] = voro(x / 2.3, y / 2.3, z / 2.3);
        if (f2 - f1 < .22 || f1 < .18) c = c2; else if (f1 < .5) c = mulC(v.cor, .82);
        if (y < cy - bh * .3 && part !== 'leg') c = lerpC(c, '#fbf3e6', .55);
        break; }
      case 'faixas': if (y > cy + bh * .15 && Math.sin(x * 1.7) > .35) c = c2; break;
      case 'faixa': if (Math.abs(x * .5 + (y - cy) * 1.2) < bh * .28 && part === 'body') c = c2; break;
      case 'peito': if ((y < cy - bh * .1 && part === 'body') || (part === 'neck' && x > 0 && y < cy + bh)) c = c2; break;
      case 'panda': if ((part === 'leg') || (part === 'body' && Math.abs(x - L * .14) < L * .13 && y > cy - bh * .6)) c = c2; break;
      default:
        if (part === 'body' && y < cy - bh * .2) c = lerpC(v.cor, '#fff6e6', .25);
    }
    if (part === 'leg' && v.padrao !== 'panda' && v.padrao !== 'listras' && v.padrao !== 'manchas') c = c.clone().multiplyScalar(.82);
    return c;
  };
}

/* ---------- Cabeça de mamífero ---------- */
function headQuad(S, v, sex, hx, hy, cab, furHead){
  const fo = v.focinho || cab * .55;
  S.e([hx, hy, 0], [cab * 1.0, cab * .86, cab * .8], furHead, {k: 1.2});
  // focinho
  S.c([hx + cab * .35, hy - cab * .12, 0], [hx + cab * .85 + fo * .85, hy - cab * .38, 0], cab * .62, Math.max(.75, cab * .36), (x, y, z) => lerpC(v.cor, v.padrao === 'listras' && v.cor === '#e8812a' ? '#fbf3e6' : v.cor, .5).multiplyScalar(.95), {k: 1.4});
  S.e([hx + cab * .88 + fo * .88, hy - cab * .32, 0], [cab * .22, cab * .2, cab * .3], '#2a1f1a', {k: .5, sharp: 6});
  // olhos
  [-1, 1].forEach(s => { S.e([hx + cab * .52, hy + cab * .2, s * cab * .6], [cab * .19, cab * .19, cab * .16], v.olhos || '#140f0c', {k: .15, sharp: 9}); S.e([hx + cab * .6, hy + cab * .27, s * cab * .68], [cab * .05, cab * .05, cab * .05], '#ffffff', {k: 0, sharp: 12}); });
  if (v.mascara) [-1, 1].forEach(s => S.e([hx + cab * .45, hy + cab * .18, s * cab * .55], [cab * .3, cab * .26, cab * .2], v.mascara, {k: .5, sharp: 5}));
  // orelhas
  const ec = v.orelhasCor || mulC(v.cor, .78);
  if (v.orelhas) [-1, 1].forEach(s => S.e([hx - cab * .3, hy + cab * .7 + v.orelhas * .4, s * cab * .5], [cab * .16, v.orelhas * .52, v.orelhas * .3], ec, {k: .7}));
  else [-1, 1].forEach(s => S.e([hx - cab * .38, hy + cab * .78, s * cab * .55], [cab * .14, cab * .32, cab * .24], ec, {k: .7}));
  // juba (machos)
  if (v.juba && sex === 'M') S.e([hx - cab * .55, hy - cab * .1, 0], [cab * 1.0, cab * 1.45, cab * 1.35], v.juba, {k: 1.5, rough: 1.4, rf: .9, sharp: 2});
  // chifres / galhadas / presas (tubos adicionados à malha)
  const ex = S.extra;
  const tubeC = (key, pts, radii, c) => ex.add(S_tube(key, pts, radii), {}, c);
  if (v.chifres) [-1, 1].forEach(s => { tubeC('oss' + s + cab, [[hx - cab * .25, hy + cab * .6, s * cab * .3], [hx - cab * .3, hy + cab * 1.35, s * cab * .35]], [.5, .42], '#5a3a1a'); ex.add(SH.sphere(8, 6), {x: hx - cab * .3, y: hy + cab * 1.4, z: s * cab * .35, s: .62}, '#2a1a0a'); });
  if (v.chifre){ ex.add(SH.cone(cab * .3, cab * 1.3, 12), {x: hx + cab * .85 + fo * .55, y: hy + cab * .05, rz: -.4}, gradFn('#a9a290', v.chifre, 0, cab, .1)); ex.add(SH.cone(cab * .2, cab * .6, 10), {x: hx + cab * .55 + fo * .3, y: hy + cab * .35, rz: -.3}, v.chifre); }
  if (v.chifreEspiral) ex.add(SH.cone(cab * .2, cab * 2.4, 14), {x: hx + cab * .35, y: hy + cab * .7, rz: -.5}, (x, y, z) => lerpC(v.chifreEspiral, '#fff6c8', Math.sin(y * 4 + Math.atan2(z, x) * 2) * .5 + .5));
  if (v.galhada && (sex !== 'F' || v.galhadaAmbos)) [-1, 1].forEach(s => {
    const b0 = [hx - cab * .3, hy + cab * .6, s * cab * .4];
    const b1 = [hx - cab * .5, hy + cab * 1.6, s * cab * 1.0], b2 = [hx - cab * .9, hy + cab * 2.5, s * cab * 1.3], b3 = [hx - cab * 1.3, hy + cab * 3.0, s * cab * 1.2];
    tubeC('gal' + s + cab, [b0, b1, b2, b3], [.55, .45, .35, .2], v.galhada);
    tubeC('galT1' + s + cab, [b1, [hx + cab * .2, hy + cab * 2.1, s * cab * 1.2]], [.38, .18], v.galhada);
    tubeC('galT2' + s + cab, [b2, [hx - cab * .4, hy + cab * 3.0, s * cab * 1.6]], [.3, .15], v.galhada);
  });
  if (v.chifresLongos) [-1, 1].forEach(s => {
    const ab = v.chifresAbertos;
    tubeC('cl' + s + cab + (ab ? 'a' : ''), ab ? [[hx - cab * .2, hy + cab * .6, s * cab * .4], [hx - cab * .2, hy + cab * .9, s * cab * 1.3], [hx - cab * .5, hy + cab * 1.5, s * cab * 1.5], [hx - cab * .3, hy + cab * 1.9, s * cab * 1.2]]
      : [[hx - cab * .2, hy + cab * .65, s * cab * .3], [hx - cab * .9, hy + cab * 1.7, s * cab * .35], [hx - cab * 1.8, hy + cab * 2.6, s * cab * .38]], [.6, .5, .35, .2].slice(0, ab ? 4 : 3), v.chifresLongos);
  });
}
function S_tube(key, pts, radii){ return SH.tube(key + JSON.stringify(pts).length + '_' + pts.map(p => p.map(n => n.toFixed(2)).join(',')).join(';'), pts, radii, 8); }

/* ---------- Cauda ---------- */
function tailQuad(S, v, x0, y0, z0, tufo){
  if (!v.cauda) return;
  const peluda = v.caudaPeluda, th = peluda ? Math.max(1.4, v.Wd * .2) : .55;
  const len = v.cauda;
  const pts = [[x0, y0, z0], [x0 - len * .35, y0 - len * .15, z0], [x0 - len * .7, y0 - len * .5, z0], [x0 - len * .85, y0 - len * .85, z0]];
  const anel = v.caudaAneis;
  const cf = (x, y, z) => anel && Math.sin((x - x0) * 1.5) > 0 ? col(anel) : col(v.cor);
  S.chain(pts, peluda ? [th * .7, th, th * .9, th * .5] : [th * 1.4, th, th * .9, th * .8], cf, {k: .8, rough: peluda ? .6 : 0, rf: 1.2});
  if (!peluda && tufo) S.e(pts[3], [1.0, 1.4, 1.0], tufo, {k: .5, rough: .5, rf: 1.5});
}

/* ---------- Construtores por tipo ----------
   Retornam {sdf, limbs:[{sdf, px,py,pz, phase, amp, kind}], wings:[...], legLen} */
function limb(top, len, rTop, rBot, color, foot, bend, o){
  const L = new SDF(); bend = bend || 0;
  const knee = [bend, -len * .5, 0];
  L.c([0, 0, 0], knee, rTop, (rTop + rBot) * .5, color, {k: .8});
  L.c(knee, [0, -len + rBot * .7, 0], (rTop + rBot) * .5, rBot, color, {k: .8});
  if (foot) L.e([rBot * .25, -len + rBot * .55, 0], [rBot * 1.15, rBot * .7, rBot * 1.05], foot, {k: .6});
  return Object.assign({sdf: L, px: top[0], py: top[1], pz: top[2]}, o || {});
}
function buildQuad(v, sex, spId){
  const S = new SDF(), L = v.L, Wd = v.Wd, cab = v.cab;
  const tall = (v.pescoco || 0) > 12;
  const legH = tall ? Wd * 1.35 : Math.max(3.4, Wd * .62), bh = Wd * .82, by = legH, cy = by + bh * .5;
  const body = furPattern(v, by, bh, L, Wd, 'body'), neckF = furPattern(v, by, bh, L, Wd, 'neck'), legF = furPattern(v, by, bh, L, Wd, 'leg');
  S.e([L * .2, cy + bh * .06, 0], [L * .27, bh * .6, Wd * .46], body, {k: 2.6});           // peito
  S.e([0, cy + bh * .04, 0], [L * .28, bh * .43, Wd * .38], body, {k: 2.6});                  // cintura
  S.e([-L * .24, cy + bh * .05, 0], [L * .25, bh * .53, Wd * .44], body, {k: 2.6});           // garupa
  S.e([L * .2, cy + bh * .42, 0], [L * .13, bh * .24, Wd * .3], body, {k: 2});                // cernelha
  const hipY = by + bh * .25;
  const legs = [[L * .3, 1], [L * .3, -1], [-L * .3, 1], [-L * .3, -1]];
  const lr = tall ? Wd * .11 : Math.max(1.0, Wd * .13);
  legs.forEach(([x, s]) => S.e([x * .96, hipY + bh * .1, s * Wd * .25], x > 0 ? [L * .09 + .7, bh * .42, Wd * .16] : [L * .13 + .8, bh * .5, Wd * .19], legF, {k: 1.6}));
  if (v.corcova){ S.e([-L * .08, cy + bh * .5, 0], [L * .15, Wd * .35, Wd * .3], body, {k: 2}); if (v.corcova > 1) S.e([L * .16, cy + bh * .48, 0], [L * .13, Wd * .32, Wd * .28], body, {k: 2}); }
  if (v.asas) [-1, 1].forEach(s => S.e([-L * .02, cy + bh * .45, s * (Wd * .42)], [L * .3, bh * .32, 1.1], v.asas, {k: .9}));
  let hx, hy;
  if (v.pescoco){
    const nx = L * .4; hx = nx + cab * .65; hy = by + bh * .8 + v.pescoco;
    S.c([L * .3, cy + bh * .2, 0], [hx - cab * .35, hy - cab * .35, 0], cab * .78, cab * .52, neckF, {k: 2});
    if (v.crina) S.c([L * .28, cy + bh * .55, 0], [hx - cab * .75, hy + cab * .2, 0], .9, .7, v.crina, {k: .6, rough: .4, rf: 2});
  } else {
    hx = L / 2 + cab * .45; hy = cy + bh * .28;
    S.c([L * .28, cy + bh * .15, 0], [hx - cab * .4, hy - cab * .05, 0], bh * .4, cab * .66, neckF, {k: 2});
    if (v.crina) S.c([L * .02, cy + bh * .52, 0], [hx - cab * .6, hy + cab * .62, 0], 1.0, .8, v.crina, {k: .7, rough: .5, rf: 2});
  }
  headQuad(S, v, sex, hx + cab * .08, hy, cab * 1.12, neckF);
  tailQuad(S, v, -L * .47, cy + bh * .25, 0, v.crina || v.juba || mulC(v.cor, .55));
  const hoof = spId && FP.SPECIES[spId] && !FP.SPECIES[spId].pred ? '#2a221c' : null;
  const limbs = legs.map(([x, s], i) => limb([x, hipY, s * Wd * .25], hipY, lr * 1.15, lr * .72, legF, hoof || legF, (x > 0 ? 1 : -1) * lr * .5, {phase: (i === 0 || i === 3) ? 0 : Math.PI, amp: .55}));
  return {sdf: S, limbs, legLen: hipY, wingsAt: v.asas ? {x: -L * .02, y: cy + bh * .5, z: Wd * .42, span: L * .75, chord: L * .4, color: v.asas} : null};
}
function buildEleph(v, sex){
  const S = new SDF(), L = v.L, Wd = v.Wd, cab = v.cab;
  const legH = Wd * .62, bh = Wd * .95, by = legH, cy = by + bh * .5;
  const skin = (x, y, z) => mulC(v.cor, .92 + (fbm(x * .8, y * 2.2, z * .8, 2) - .5) * .25);
  S.e([L * .1, cy + bh * .05, 0], [L * .4, bh * .56, Wd * .5], skin, {k: 3});
  S.e([-L * .2, cy, 0], [L * .3, bh * .52, Wd * .47], skin, {k: 3});
  const hipY = by + bh * .25, lr = Wd * .17;
  const legs = [[L * .28, 1], [L * .28, -1], [-L * .28, 1], [-L * .28, -1]];
  legs.forEach(([x, s]) => S.e([x, hipY + bh * .1, s * Wd * .27], [L * .11, bh * .4, Wd * .19], skin, {k: 2}));
  const hx = L / 2 + cab * .3, hy = cy + bh * .3;
  S.e([hx, hy, 0], [cab * .95, cab * 1.05, cab * .9], skin, {k: 2.5});
  [-1, 1].forEach(s => S.e([hx - cab * .55, hy + cab * .05, s * cab * .95], [cab * .16, cab * 1.15, cab * .95], (x, y, z) => mulC(v.cor2 || v.cor, .95 + fbm(x, y, z) * .1), {k: .9}));
  S.chain([[hx + cab * .6, hy - cab * .2, 0], [hx + cab * 1.0, hy - cab * 1.1, 0], [hx + cab * 1.1, hy - cab * 1.9, 0], [hx + cab * 1.3, hy - cab * 2.5, 0]], [cab * .45, cab * .34, cab * .26, cab * .22], skin, {k: 1.2});
  [-1, 1].forEach(s => S.e([hx + cab * .5, hy + cab * .25, s * cab * .78], [cab * .12, cab * .12, cab * .1], '#140f0c', {k: .2, sharp: 8}));
  [-1, 1].forEach(s => S.extra.add(S_tube('tusk' + s + cab, [[hx + cab * .65, hy - cab * .45, s * cab * .45], [hx + cab * 1.25, hy - cab * 1.0, s * cab * .55], [hx + cab * 1.7, hy - cab * .9, s * cab * .5]], [cab * .13, cab * .1, cab * .04]), {}, '#f4efe0'));
  tailQuad(S, Object.assign({}, v, {cauda: v.cauda * 1.3}), -L * .48, cy + bh * .2, 0, '#2a2420');
  const limbs = legs.map(([x, s], i) => limb([x, hipY, s * Wd * .27], hipY, lr, lr * .95, skin, '#6a665e', 0, {phase: (i === 0 || i === 3) ? 0 : Math.PI, amp: .3}));
  return {sdf: S, limbs, legLen: hipY};
}
function buildRept(v){
  const S = new SDF(), L = v.L, Wd = v.Wd, bl = L * .42, bh = Wd * .5, leg = 1.8, cy = leg + bh * .5;
  const skin = (x, y, z) => { const sc = voro(x / 1.1, y / 1.1, z / 1.1); let c = y > cy + bh * .25 ? col(v.cor2) : col(v.cor); if (y < cy - bh * .2) c = lerpC(v.cor, '#d8d0a0', .45); return c.clone().multiplyScalar(.85 + (sc[1] - sc[0]) * .5); };
  S.e([0, cy, 0], [bl * .62, bh * .55, Wd * .52], skin, {k: 2});
  for (let x = -bl * .5; x < bl * .5; x += 2.6) [-1, 1].forEach(s => S.e([x, cy + bh * .45, s * Wd * .2], [.8, .55, .6], v.cor2, {k: .5}));
  const tail = []; const tr = [];
  for (let i = 0; i <= 5; i++){ const t = i / 5; tail.push([-bl * .55 - t * v.cauda, cy - t * bh * .45, Math.sin(t * 2) * 1.2]); tr.push(Math.max(.5, Wd * .4 * (1 - t * .85))); }
  S.chain(tail, tr, skin, {k: 1.2});
  const hx = bl * .55 + v.cab * .6;
  S.e([hx, cy + bh * .05, 0], [v.cab * .95, bh * .42, v.cab * .9], skin, {k: 1.5});
  S.c([hx + v.cab * .5, cy, 0], [hx + v.cab * .6 + v.focinho, cy - bh * .12, 0], v.cab * .62, v.cab * .35, skin, {k: 1.2});
  [-1, 1].forEach(s => S.e([hx + .3, cy + bh * .38, s * v.cab * .55], [.65, .6, .55], '#d8c850', {k: .3, sharp: 6}));
  const legs = [[bl * .32, 1], [bl * .32, -1], [-bl * .32, 1], [-bl * .32, -1]];
  const limbs = legs.map(([x, s], i) => {
    const Lm = new SDF();
    Lm.c([0, 0, 0], [0, -leg * .3, s * Wd * .45], 1.1, .9, skin, {k: .6});
    Lm.c([0, -leg * .3, s * Wd * .45], [.4, -leg, s * Wd * .55], .9, .7, skin, {k: .6});
    Lm.e([.8, -leg + .4, s * Wd * .55], [1.2, .45, .9], skin, {k: .4});
    return {sdf: Lm, px: x, py: cy - bh * .1, pz: s * Wd * .3, phase: (i === 0 || i === 3) ? 0 : Math.PI, amp: .5, axis: 'y'};
  });
  return {sdf: S, limbs, legLen: cy - bh * .1, low: true};
}
function buildSnake(v){
  const S = new SDF(), L = v.L, Wd = v.Wd;
  const skin = (x, y, z) => { const t = Math.sin(x * .9 + z * .9) * Math.sin(x * .9 - z * .9); let c = t > .35 ? col(v.cor2) : col(v.cor); if (y < Wd * .25) c = lerpC(c, '#e8dca0', .4); return c; };
  const pts = [], rr = [];
  const n = 18;
  for (let i = 0; i <= n; i++){ const t = i / n, a = t * Math.PI * 3.2; const rad = L * .26 * (1 - t * .55); pts.push([Math.cos(a) * rad, Wd * .45 * (1 - t * .3), Math.sin(a) * rad]); rr.push(Wd * .48 * (1 - t * .7)); }
  pts.reverse(); rr.reverse();
  S.chain(pts, rr, skin, {k: 1});
  const h = pts[pts.length - 1];
  S.e([h[0] + v.cab * .6, h[1] + v.cab * .3, h[2]], [v.cab * 1.1, v.cab * .6, v.cab * .8], skin, {k: 1.2});
  [-1, 1].forEach(s => S.e([h[0] + v.cab * .9, h[1] + v.cab * .65, h[2] + s * v.cab * .5], [.5, .5, .45], '#e8d84a', {k: .2, sharp: 8}));
  return {sdf: S, limbs: [], legLen: 0};
}
function buildBird(v, sex, spId){
  const S = new SDF(), L = v.L, Wd = v.Wd, cab = v.cab, long = (v.pescoco || 0) > 6;
  const sp = FP.SPECIES[spId] || {};
  const leg = long ? Wd * 1.15 : Math.max(2.2, Wd * .38), bh = Wd * .72, by = leg, cy = by + bh * .5;
  const plum = (x, y, z) => { let c = col(v.cor); if (v.cor2 && y < cy - bh * .05 && x > -L * .1) c = col(v.cor2); return c.clone().multiplyScalar(1 + (vnoise(x * 2.5, y * 2.5, z * 2.5) - .5) * .12); };
  S.c([-L * .3, cy + bh * .12, 0], [L * .2, cy, 0], bh * .44, bh * .55, plum, {k: 2});
  S.e([L * .12, cy - bh * .05, 0], [L * .25, bh * .5, Wd * .44], plum, {k: 2});
  // asas recolhidas
  [-1, 1].forEach(s => S.e([-L * .06, cy + bh * .15, s * Wd * .4], [L * .34, bh * .36, 1.0], v.asas, {k: .9}));
  // cauda
  if (v.leque){
    const ex = S.extra;
    for (let i = 0; i < 13; i++){ const a = (i - 6) * .19; ex.add(SH.sphere(14, 8), {x: -L * .45 - Math.cos(a) * L * .1, y: cy + L * .55 * Math.cos(a) * .9, z: L * .55 * Math.sin(a), sx: .5, sy: L * .45, sz: 1.9, rx: a, rz: .35}, (x, y, z) => { const d = Math.hypot(y - (cy + L * .9), z) ; return y > cy + L * .7 ? lerpC(v.leque, '#1a2a8a', Math.sin(y * 1.5) * .5 + .5) : col(v.leque); }); }
  } else S.e([-L * .48, cy + bh * .15, 0], [L * .22, .9, Wd * .3], v.cauda, {k: .8});
  if (v.fogo){ S.e([-L * .55, cy + bh * .3, 0], [L * .25, 2.2, 2.2], '#ffd23f', {k: .8, rough: 1.2, rf: 1}); }
  let hx = L * .38, hy = cy + bh * .55 + cab * .4;
  if (v.pescoco){
    hx = L * .42; hy = cy + v.pescoco + cab * .2;
    const mid = [L * .5, cy + v.pescoco * .5, 0];
    S.chain([[L * .3, cy + bh * .2, 0], long ? [L * .2, cy + v.pescoco * .55, 0] : mid, [hx - cab * .3, hy - cab * .5, 0]], [cab * .6, cab * .42, cab * .45], v.colar ? (x, y, z) => y < cy + v.pescoco * .35 ? col(v.colar) : col('#1a1a1a') : plum, {k: 1.4});
  }
  S.e([hx, hy, 0], [cab * .95, cab * .85, cab * .8], v.colar ? '#1a1a1a' : (x, y, z) => col(v.cor), {k: 1.3});
  const bl = v.bicoL || 3;
  S.c([hx + cab * .6, hy - cab * .1, 0], [hx + cab * .75 + bl, hy - (bl > 5 ? cab * .6 : cab * .2), 0], Math.min(cab * .45, 1.4), .25, v.bico, {k: .4, sharp: 5});
  [-1, 1].forEach(s => S.e([hx + cab * .35, hy + cab * .22, s * cab * .68], [.55, .55, .4], '#0a0a0a', {k: .2, sharp: 8}));
  const legCol = v.bico || '#c9a060';
  const limbs = [[1], [-1]].map(([s], i) => limb([L * .02, by + bh * .2, s * Wd * .2], by + bh * .2, .55, .38, legCol, legCol, .4, {phase: i ? Math.PI : 0, amp: .5}));
  const flies = sp.voa || v.tipo === 'ave' && !['avestruz', 'ema', 'pinguim'].includes(spId);
  return {sdf: S, limbs, legLen: by + bh * .2, wingsAt: flies ? {x: -L * .05, y: cy + bh * .35, z: Wd * .38, span: L * .7, chord: L * .42, color: v.asas} : null};
}
function buildPeng(v){
  const S = new SDF(), L = v.L, Wd = v.Wd, h = L * .95, cy = .8 + h * .5;
  const plum = (x, y, z) => (x > Wd * .08 && y < cy + h * .35) ? col(v.cor2) : col(v.cor);
  S.e([0, cy, 0], [Wd * .48, h * .52, Wd * .44], plum, {k: 2});
  [-1, 1].forEach(s => S.e([0, cy + h * .05, s * Wd * .5], [Wd * .22, h * .3, .7], v.cor, {k: .8}));
  const hy = .8 + h + v.cab * .4;
  S.e([Wd * .05, hy, 0], [v.cab * .9, v.cab * .82, v.cab * .82], v.cor, {k: 1.6});
  [-1, 1].forEach(s => S.e([v.cab * .35, hy + .2, s * v.cab * .62], [.9, .5, .3], v.cor2, {k: .4}));
  S.c([v.cab * .6, hy - .2, 0], [v.cab * .7 + 2.4, hy - .5, 0], .7, .2, v.bico, {k: .4});
  [-1, 1].forEach(s => S.e([1, .4, s * Wd * .2], [1.4, .35, .8], '#f39c12', {k: .5}));
  return {sdf: S, limbs: [], legLen: 0, waddle: true};
}
function buildShell(v){
  const S = new SDF(), L = v.L, Wd = v.Wd;
  const shell = (x, y, z) => { const [f1, f2] = voro(x / 3, y / 3, z / 3); return (f2 - f1) < .12 ? col(v.cor) : lerpC(v.cor2, v.cor, f1 * .8); };
  S.e([0, 1.6 + Wd * .1, 0], [L * .5, Wd * .38, Wd * .5], shell, {k: .5});
  S.e([0, 1.5, 0], [L * .52, .6, Wd * .52], mulC(v.cor, .8), {k: .4});
  const skin = '#8c7a45';
  S.c([L * .4, 1.6, 0], [L * .6, 2.2, 0], v.cab * .45, v.cab * .4, skin, {k: .6});
  S.e([L * .62 + v.cab * .3, 2.3, 0], [v.cab * .7, v.cab * .55, v.cab * .55], skin, {k: .8});
  [-1, 1].forEach(s => S.e([L * .62 + v.cab * .6, 2.55, s * v.cab * .35], [.35, .35, .3], '#111', {k: .2, sharp: 8}));
  const legs = [[L * .3, 1], [L * .3, -1], [-L * .3, 1], [-L * .3, -1]];
  const limbs = legs.map(([x, s], i) => { const Lm = new SDF(); Lm.c([0, 0, 0], [0, -1.5, s * .4], 1.2, 1.0, skin, {k: .5}); Lm.e([.2, -1.3, s * .4], [1.3, .5, 1.1], skin, {k: .4}); return {sdf: Lm, px: x, py: 1.6, pz: s * Wd * .42, phase: (i === 0 || i === 3) ? 0 : Math.PI, amp: .35}; });
  return {sdf: S, limbs, legLen: 1.6};
}
function buildPrim(v){
  const S = new SDF(), L = v.L, Wd = v.Wd, cab = v.cab, br = v.bracos, leg = Math.max(2.4, Wd * .4);
  const shaggy = Wd >= 14;
  const fur = (x, y, z) => mulC(v.cor, 1 + (vnoise(x * 1.5, y * 1.5, z * 1.5) - .5) * .2);
  const bh = Wd * 1.0, hipY = leg + Wd * .15;
  S.c([-L * .05, hipY + Wd * .1, 0], [L * .18, hipY + bh, 0], Wd * .4, Wd * .44, fur, {k: 2, rough: shaggy ? .8 : 0, rf: 1});
  const hx = L * .26, hy = hipY + bh + cab * .65;
  S.e([hx, hy, 0], [cab * .9, cab * .9, cab * .85], fur, {k: 1.4, rough: shaggy ? .5 : 0, rf: 1.2});
  S.e([hx + cab * .55, hy - cab * .12, 0], [cab * .45, cab * .55, cab * .62], v.cor2, {k: .7});
  [-1, 1].forEach(s => S.e([hx + cab * .82, hy + cab * .12, s * cab * .28], [.4, .45, .4], '#0e0a08', {k: .2, sharp: 8}));
  [-1, 1].forEach(s => S.e([hx - cab * .05, hy + cab * .1, s * cab * .82], [cab * .18, cab * .26, cab * .16], v.cor2, {k: .5}));
  const legs = [1, -1].map((s, i) => limb([0, hipY, s * Wd * .25], hipY, Wd * .16, Wd * .12, fur, mulC(v.cor, .7), .5, {phase: i ? Math.PI : 0, amp: .5}));
  const arms = [1, -1].map((s, i) => limb([L * .16, hipY + bh * .85, s * Wd * .5], br, Wd * .14, Wd * .11, fur, v.cor2, -.8, {phase: i ? 0 : Math.PI, amp: .55, arm: true}));
  return {sdf: S, limbs: legs.concat(arms), legLen: hipY};
}
function buildGrif(v, sex){
  const q = buildQuad(Object.assign({}, v, {padrao: 'nenhum', asas: v.asas, crina: null, juba: null, cauda: v.cauda}), sex, 'grifo');
  const S = q.sdf, L = v.L, Wd = v.Wd, cab = v.cab;
  const bh = Wd * .82, by = Math.max(3.4, Wd * .62), cy = by + bh * .5;
  const hx = L / 2 + cab * .45, hy = cy + bh * .28;
  S.e([hx - cab * .2, hy - cab * .3, 0], [cab * 1.3, cab * 1.4, cab * 1.15], v.cor2, {k: 1.5, rough: .5, rf: 1.4});
  S.c([hx + cab * .7, hy, 0], [hx + cab * 1.6, hy - cab * .8, 0], cab * .5, .3, v.bico, {k: .4, sharp: 5});
  return q;
}
function buildDrag(v){
  const S = new SDF(), L = v.L, Wd = v.Wd, bl = L * .45, leg = Wd * .55, bh = Wd * .75, cy = leg + bh * .5;
  const skin = (x, y, z) => { const sc = voro(x / 1.4, y / 1.4, z / 1.4); let c = y < cy - bh * .15 ? col(v.cor2) : col(v.cor); return c.clone().multiplyScalar(.85 + (sc[1] - sc[0]) * .45); };
  S.e([0, cy, 0], [bl * .6, bh * .58, Wd * .5], skin, {k: 2});
  const tail = [], tr = [];
  for (let i = 0; i <= 6; i++){ const t = i / 6; tail.push([-bl * .55 - t * v.cauda, cy - t * bh * .3 + Math.sin(t * 3) * 1.5, Math.sin(t * 2.5) * 2]); tr.push(Math.max(.5, Wd * .38 * (1 - t * .85))); }
  S.chain(tail, tr, skin, {k: 1.2});
  const nk = [[bl * .45, cy + bh * .3, 0], [bl * .6 + 2, cy + bh + 3, 0], [bl * .6 + 5, cy + bh + 6, 0]];
  S.chain(nk, [Wd * .32, Wd * .24, Wd * .2], skin, {k: 1.5});
  const hx = nk[2][0] + v.cab * .5, hy = nk[2][1] + v.cab * .2;
  S.e([hx, hy, 0], [v.cab * 1.0, v.cab * .72, v.cab * .75], skin, {k: 1.3});
  S.c([hx + v.cab * .5, hy - .3, 0], [hx + v.cab * .7 + v.focinho, hy - .8, 0], v.cab * .55, v.cab * .35, skin, {k: 1});
  [-1, 1].forEach(s => { S.e([hx + v.cab * .3, hy + v.cab * .35, s * v.cab * .55], [.7, .6, .45], '#ffd23f', {k: .2, sharp: 8}); S.extra.add(SH.cone(.6, v.cab * 1.6, 10), {x: hx - v.cab * .5, y: hy + v.cab * .4, z: s * v.cab * .45, rz: .9, rx: -s * .2}, '#e8e2d0'); });
  for (let i = 0; i < 9; i++){ const t = i / 8; const p = i < 5 ? [bl * .4 - t * bl * 1.4, cy + bh * .55, 0] : tail[Math.min(6, i - 4)]; S.extra.add(SH.cone(.9, 2.2 - t, 8), {x: p[0], y: p[1] + (i < 5 ? 0 : tr[Math.min(6, i - 4)] * .7), z: p[2]}, v.cor2); }
  const legs = [[bl * .32, 1], [bl * .32, -1], [-bl * .32, 1], [-bl * .32, -1]];
  const limbs = legs.map(([x, s], i) => limb([x, leg + bh * .2, s * Wd * .4], leg + bh * .2, 2.2, 1.6, skin, mulC(v.cor, .7), .8, {phase: (i === 0 || i === 3) ? 0 : Math.PI, amp: .45}));
  return {sdf: S, limbs, legLen: leg + bh * .2, wingsAt: {x: -bl * .05, y: cy + bh * .5, z: Wd * .45, span: L * .7, chord: bl * .9, color: v.asas}};
}
function buildSeal(v){
  const S = new SDF(), L = v.L, Wd = v.Wd, h = Wd * .7;
  const skin = (x, y, z) => { let c = col(v.cor); if (v.cor2 && vnoise(x * .9, y * .9, z * .9) > .62) c = col(v.cor2); if (y < h * .3) c = lerpC(c, '#dcd6cc', .3); return c; };
  S.c([-L * .45, h * .3, 0], [L * .12, h * .55, 0], Wd * .2, Wd * .5, skin, {k: 2});
  [-1, 1].forEach(s => S.e([-L * .55, h * .22, s * Wd * .22], [L * .1, .5, Wd * .18], mulC(v.cor, .75), {k: .6}));
  [-1, 1].forEach(s => S.e([L * .12, h * .25, s * (Wd * .5)], [L * .1, .5, Wd * .16], mulC(v.cor, .8), {k: .6}));
  const hx = L * .35, hy = h + v.cab * .45;
  S.c([L * .2, h * .6, 0], [hx - v.cab * .3, hy - v.cab * .3, 0], Wd * .4, v.cab * .8, skin, {k: 2});
  S.e([hx, hy, 0], [v.cab * .95, v.cab * .82, v.cab * .82], skin, {k: 1.4});
  S.e([hx + v.cab * .7, hy - v.cab * .25, 0], [v.cab * .45, v.cab * .4, v.cab * .55], lerpC(v.cor, '#e8e0d8', .3), {k: .8});
  [-1, 1].forEach(s => S.e([hx + v.cab * .45, hy + v.cab * .25, s * v.cab * .6], [.55, .55, .4], '#0a0a0a', {k: .2, sharp: 8}));
  if (v.presas) [-1, 1].forEach(s => S.extra.add(S_tube('pres' + s + v.cab, [[hx + v.cab * .7, hy - v.cab * .5, s * v.cab * .35], [hx + v.cab * .85, hy - v.cab * 1.6, s * v.cab * .4], [hx + v.cab * .7, hy - v.cab * 2.2, s * v.cab * .38]], [.65, .5, .2]), {}, v.presas));
  return {sdf: S, limbs: [], legLen: 0, slide: true};
}

/* Asa aberta (para voo): envergadura em Z a partir do ombro */
function wingSDF(w, side){
  const S = new SDF();
  const c = col(w.color);
  const f = (x, y, z) => c.clone().multiplyScalar(.85 + Math.abs(Math.sin(Math.abs(z) * 1.6)) * .2 - (x < -w.chord * .25 ? .12 : 0));
  S.e([-w.chord * .1, 0, side * w.span * .32], [w.chord * .45, .6, w.span * .34], f, {k: 1});
  S.e([-w.chord * .25, 0, side * w.span * .62], [w.chord * .3, .45, w.span * .22], f, {k: 1});
  return S;
}

const modelCache = new Map();
M3.hasModel = (spId, sexKey) => modelCache.has(spId + '|' + sexKey);
M3.animalModel = function(spId, sexKey){
  const key = spId + '|' + sexKey;
  if (modelCache.has(key)) return modelCache.get(key);
  const sp = FP.SPECIES[spId], v = sp.vis;
  const B = {quad: buildQuad, elefante: buildEleph, reptil: buildRept, ave: buildBird, pinguim: buildPeng, casco: buildShell, primata: buildPrim, grifo: buildGrif, dragao: buildDrag, foca: buildSeal, cobra: buildSnake};
  const r = (B[v.tipo] || buildQuad)(v, sexKey === 'X' ? 'M' : sexKey, spId);
  const res = Math.round(U.clamp(40 + v.L * .4, 46, 64));
  const out = {body: r.sdf.mesh(res), limbs: [], wings: null, legLen: r.legLen / T * 1.12, waddle: r.waddle, slide: r.slide, low: r.low};
  r.limbs.forEach(l => out.limbs.push({geo: l.sdf.mesh(26), x: l.px / T * 1.12, y: l.py / T * 1.12, z: l.pz / T * 1.12, phase: l.phase, amp: l.amp, axis: l.axis || 'z', arm: l.arm}));
  if (r.wingsAt){ const w = r.wingsAt; out.wings = {L: wingSDF(w, 1).mesh(30), R: wingSDF(w, -1).mesh(30), x: w.x / T * 1.12, y: w.y / T * 1.12, z: w.z / T * 1.12 * .6}; }
  modelCache.set(key, out);
  return out;
};
/* modelo estático (estátua): corpo + membros em repouso */
M3.statueGeo = function(spId){
  if (!FP.SPECIES[spId]) return null;
  const m = M3.animalModel(spId, 'M');
  const mb = new MB(); mb.add(m.body);
  m.limbs.forEach(l => mb.add(l.geo, {x: l.x, y: l.y, z: l.z}));
  return mb.geo();
};

/* =========================================================
   PESSOAS (geometrias para instâncias)
   ========================================================= */
M3.personGeos = function(){
  const capsule = (r, h, seg) => { const p = []; for (let i = 0; i <= 5; i++){ const a = -Math.PI / 2 + i / 5 * Math.PI / 2; p.push([Math.cos(a) * r, r + Math.sin(a) * r]); } for (let i = 0; i <= 5; i++){ const a = i / 5 * Math.PI / 2; p.push([Math.cos(a) * r, h - r + Math.sin(a) * r]); } return S.lathe('cap' + r + '_' + h, p, seg || 10); };
  const torso = S.lathe('torso', [[0, 0], [.072, 0], [.08, .04], [.078, .12], [.086, .19], [.07, .22], [.03, .235], [0, .24]], 12);
  const head = S.sphere(12, 10);
  const hairG = (() => { const g = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55); return g; })();
  const leg = capsule(.034, .23, 8).clone(); leg.translate(0, -.23, 0);
  const arm = capsule(.026, .2, 8).clone(); arm.translate(0, -.2, 0);
  return {torso, head, hair: hairG, leg, arm};
};

/* =========================================================
   CARROS
   ========================================================= */
M3.carGeo = function(cor){
  return cached('car' + cor, () => {
    const mb = new MB();
    mb.add(S.rbox(.36, .14, .7, .05, 3), {y: .05}, cor);
    mb.add(S.rbox(.31, .13, .38, .05, 3), {y: .17, z: -.03}, '#1d2a33');
    mb.add(S.rbox(.33, .03, .4, .015, 2), {y: .29, z: -.03}, cor);
    [[-.17, -.21], [.17, -.21], [-.17, .21], [.17, .21]].forEach(([x, z]) => mb.add(S.cyl(.06, .06, .05, 14), {x, y: .06, z, rz: Math.PI / 2}, '#18181a'));
    [-.11, .11].forEach(x => { mb.add(S.sphere(8, 6), {x, y: .12, z: .35, sx: .04, sy: .025, sz: .01}, '#fff6c8', true); mb.add(S.sphere(8, 6), {x, y: .12, z: -.35, sx: .04, sy: .025, sz: .01}, '#d8261a', true); });
    return mb.geo();
  });
};
})();
