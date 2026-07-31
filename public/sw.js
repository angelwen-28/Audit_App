const CACHE_NAME = 'aegis-auditor-cache-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[Service Worker] Asset pre-caching failed slightly (CDN files might be offline):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First Strategy
self.addEventListener('fetch', (e) => {
  // Only handle GET requests and skip Supabase/Extensions to prevent fetch errors
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co') || e.request.url.includes('chrome-extension')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Cache the newly retrieved response for offline access
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline)
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          console.warn('[Service Worker] Resource offline and not in cache:', e.request.url);
        });
      })
  );
});
