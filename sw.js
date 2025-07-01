const CACHE = 'dann-v1';
const PRECACHE = [
  '/', 'index.html', 'theme.css', 'theme.js', 'auth.js', 'dashboard.js', 'dashboard.html',
  'login.html', 'signup.html', 'about.html', 'contact.html', 'portfolio.html', 'donate.html',
  'biography.html', 'creator.html', 'cosine.html', 'location.html',
  // Pomodoro and features (data is always in localStorage, but for offline code robustness)
  // No separate file, but ensure dashboard.js, dashboard.html, auth.js are all included
  'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(PRECACHE.map(async url => {
        try { await cache.add(url); } catch (e) { /* ignore failures */ }
      }));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(resp => {
      if (resp) return resp;
      return fetch(event.request).then(netResp => {
        if (event.request.url.startsWith('http')) {
          caches.open(CACHE).then(cache => cache.put(event.request, netResp.clone()));
        }
        return netResp;
      }).catch(() => {
        // Optionally: return offline fallback
      });
    })
  );
});