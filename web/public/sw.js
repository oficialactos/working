self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Desativando o cache de fetch para garantir que o navegador busque sempre a versão nova do código
self.addEventListener('fetch', (event) => {
  return; // Não faz nada, deixa o navegador seguir o fluxo normal (Rede)
});
