/* Faunópolis — service worker: o jogo funciona offline depois da 1ª visita */
const CACHE = 'faunopolis-__VERSION__';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('faunopolis-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// rede primeiro (sempre a versão mais nova); sem internet, usa o cache
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
