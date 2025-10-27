// ============================================
// 🔧 SERVICE WORKER - PWA Support
// ============================================

const CACHE_NAME = 'absensi-v1.0.0';
const RUNTIME_CACHE = 'absensi-runtime';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/employee.html',
  '/admin.html',
  '/login.html',
  '/offline.html',
  '/manifest.json',
  
  // CSS & JS
  '/firebase-config.js',
  '/storage-firebase.js',
  '/admin-auth.js',
  
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  
  // External CDN (cache strategically)
  'https://cdn.tailwindcss.com',
];

// CDN resources that should be cached
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
];

// ============================================
// 📦 INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  
  // Force new service worker to activate immediately
  self.skipWaiting();
});

// ============================================
// 🔄 ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// ============================================
// 🌐 FETCH EVENT - Serve from cache, fallback to network
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests that are not CDN
  if (url.origin !== location.origin && !isCDNUrl(url.href)) {
    return;
  }
  
  // HTML pages: Network first, cache fallback
  if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Try cache
          return caches.match(request).then((cachedResponse) => {
            // Return cached or offline page
            return cachedResponse || caches.match('/offline.html');
          });
        })
    );
    return;
  }
  
  // JS, CSS, Images, Fonts: Cache first, network fallback
  if (
    request.headers.get('Accept').includes('application/javascript') ||
    request.headers.get('Accept').includes('text/css') ||
    request.headers.get('Accept').includes('image') ||
    request.url.includes('font')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          // Don't cache if not ok
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          
          return response;
        });
      })
    );
    return;
  }
  
  // Face-API models: Cache first
  if (url.href.includes('face-api.js') || url.href.includes('weights')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
  
  // Firebase, API calls: Network only (don't cache dynamic data)
  if (
    url.href.includes('firebaseio.com') ||
    url.href.includes('googleapis.com') ||
    url.href.includes('nominatim.openstreetmap.org')
  ) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Default: Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// 🔔 PUSH NOTIFICATION (Optional)
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sistem Absensi';
  const options = {
    body: data.body || 'Anda memiliki notifikasi baru',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'absensi-notification',
    requireInteraction: false,
    data: data.url || '/',
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// ============================================
// 📡 BACKGROUND SYNC (Optional)
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  // Sync pending attendance when back online
  console.log('[SW] Syncing attendance data...');
  // Implementation depends on your storage strategy
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================
function isCDNUrl(url) {
  return CDN_URLS.some((cdnUrl) => url.includes(cdnUrl));
}

// ============================================
// 📊 MESSAGE HANDLER (for cache updates)
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
