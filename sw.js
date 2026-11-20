/* Faunópolis — service worker: o jogo funciona offline (bom para o celular na faculdade, no ônibus…) */
const CACHE = 'faunopolis-__VERSION__';
// arquivos do jogo baixados já na 1ª visita (a lista é preenchida por scripts/build-web.mjs)
const PRECACHE = __PRECACHE__;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('faunopolis-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// rede primeiro (sempre a versão mais nova); sem internet (ou rede muito lenta), usa o cache
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fontes do Google: guardadas na 1ª visita para o jogo ficar igual sem internet
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  const net = fetch(req).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  const cached = () => caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match('./').then(x => x || caches.match('index.html')) : undefined));
  // em Wi-Fi de campus instável: se a rede não responder em 4 s e houver cópia, usa a cópia
  const slow = new Promise(r => setTimeout(r, 4000)).then(cached).then(r => r || net);
  e.respondWith(Promise.race([net.catch(cached), slow]).then(r => r || cached()).catch(cached));
});
