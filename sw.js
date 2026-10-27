/* Service Worker — DFC Belt Correias
   Estratégia:
   - App shell (o próprio index.html, ícones): cache-first, para abrir offline e instalar.
   - Dados do Google Sheets (CSV): SEMPRE da rede (network-only), nunca cacheados,
     para o painel mostrar sempre os números atuais.
*/
const CACHE = 'dfc-belt-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Dados (Google / planilha) e CDNs externos: vão direto para a rede.
  const ehExterno = url.origin !== self.location.origin;
  if (ehExterno) {
    e.respondWith(fetch(req).catch(() => new Response('', {status: 504})));
    return;
  }

  // App shell (mesmo domínio): cache primeiro, atualizando em segundo plano.
  e.respondWith(
    caches.match(req).then(cached => {
      const rede = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(()=>{});
        }
        return resp;
      }).catch(() => cached);
      return cached || rede;
    })
  );
});
