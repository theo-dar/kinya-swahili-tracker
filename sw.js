// sw.js — Service worker : permet à l'app de marcher hors ligne.
// Stratégie « réseau d'abord » : si Internet marche, on prend la version fraîche
// (et on la garde en cache) ; sinon, on sert la copie du cache.
const CACHE = 'kinya-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        if (reponse.status === 200) {
          const copie = reponse.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(e.request))
  );
});
