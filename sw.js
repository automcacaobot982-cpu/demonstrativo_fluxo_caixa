/* ============================================================================
   Service Worker — DFC Belt Correias
   - Necessário para o Chrome/Android considerar a página "instalável".
   - Guarda a "casca" do app (HTML, ícones) para abrir offline.
   - NUNCA guarda os dados da planilha do Google Sheets: esses sempre vão
     direto à internet, para os valores nunca ficarem desatualizados.
   ========================================================================== */
const CACHE = 'dfc-belt-v2';

// Arquivos locais da casca do app (caminhos relativos ao escopo).
const SHELL = [
  '.',
  'index.html',
  'manifest.json',
  'favicon.png',
  'icon-192.png',
  'icon-512.png',
  'maskable-192.png',
  'maskable-512.png',
  'apple-touch-icon.png'
];

// Instala: pré-carrega a casca. addAll falha se um arquivo faltar, então
// adicionamos um a um e ignoramos o que não existir (ex.: ícone opcional).
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

// Ativa: limpa versões antigas do cache.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Dados da planilha e qualquer chamada externa (Google, CDN de fontes/Chart.js):
  // sempre rede. Nunca servir do cache -> números sempre atuais.
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): tenta rede, cai para o index em cache se offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html').then((r) => r || caches.match('.')))
    );
    return;
  }

  // Demais arquivos locais (ícones, manifest): cache primeiro, rede como reforço.
  e.respondWith(
    caches.match(req).then((cacheado) => cacheado || fetch(req).then((resp) => {
      const copia = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
      return resp;
    }).catch(() => cacheado))
  );
});
