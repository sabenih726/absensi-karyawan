// ============================================
// 🔧 SERVICE WORKER - PWA OPTIMIZED
// ============================================
console.log('🔧 Service Worker loading...');

const VERSION = '1.0.0';  // ← Increment untuk force update
const CACHE_NAME = `absensi-app-v${VERSION}`;
const RUNTIME_CACHE = `absensi-runtime-v${VERSION}`;

// ============================================
// 📦 FILES TO PRECACHE
// ============================================
const PRECACHE_URLS = [
  // HTML Pages
  '/',
  '/index.html',
  '/employee.html',
  '/admin.html',
  '/login.html',
  
  // JavaScript Files
  '/firebase-config.js',
  '/storage-firebase.js',
  '/admin-auth.js',
  '/password-auth.js',
  
  // PWA Files
  '/manifest.json',
  
  // Icons - Sesuaikan dengan file Anda
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico'
];

// ============================================
// 🌐 CDN URLS (optional caching)
// ============================================
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/face-api.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.sheetjs.com/xlsx',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable'
];

// ============================================
// 📥 INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('✅ [SW] Installing v' + VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 [SW] Caching app shell');
        
        // Gunakan Promise.allSettled untuk skip error
        return Promise.allSettled(
          PRECACHE_URLS.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`⚠️ Failed to cache: ${url}`, error);
              return null;
            });
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Cache complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ [SW] Install failed:', error);
      })
  );
});

// ============================================
// 🔄 ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🔄 [SW] Activating v' + VERSION);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('🗑️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================
// 🌐 FETCH EVENT - Smart Caching Strategy
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ==========================================
  // 🔒 SKIP: Firebase & API calls (Network Only)
  // ==========================================
  if (
    url.href.includes('firebaseio.com') ||
    url.href.includes('googleapis.com') ||
    url.href.includes('firebasestorage') ||
    url.href.includes('nominatim.openstreetmap.org') ||
    url.href.includes('identitytoolkit')
  ) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ==========================================
  // 🌍 CROSS-ORIGIN: CDN (Cache First + Network Update)
  // ==========================================
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('📦 [SW] CDN Cache hit:', url.pathname);
            
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response && response.status === 200) {
                  caches.open(RUNTIME_CACHE)
                    .then(cache => cache.put(request, response.clone()))
                    .catch(() => {});
                }
              })
              .catch(() => {});
            
            return cachedResponse;
          }
          
          // Fetch from network and cache
          return fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then(cache => cache.put(request, responseClone))
                  .catch(() => {});
              }
              return response;
            })
            .catch(() => {
              return new Response('Offline - CDN unavailable', { status: 503 });
            });
        })
    );
    return;
  }
  
  // ==========================================
  // 📄 HTML: Network First (Always fresh)
  // ==========================================
  if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh response
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then(cache => cache.put(request, responseClone))
            .catch(() => {});
          
          return response;
        })
        .catch(() => {
          // Fallback: Cache -> Offline Page
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Inline Offline Page
              return new Response(
                generateOfflinePage(),
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }
  
  // ==========================================
  // 🎨 STATIC ASSETS: Cache First (JS, CSS, Images, Fonts)
  // ==========================================
  if (
    request.headers.get('Accept')?.includes('application/javascript') ||
    request.headers.get('Accept')?.includes('text/css') ||
    request.headers.get('Accept')?.includes('image') ||
    request.url.includes('font') ||
    request.url.includes('.js') ||
    request.url.includes('.css') ||
    request.url.includes('.png') ||
    request.url.includes('.jpg') ||
    request.url.includes('.svg') ||
    request.url.includes('.woff')
  ) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('📦 [SW] Static cache hit:', url.pathname);
            
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response && response.status === 200) {
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, response.clone()))
                    .catch(() => {});
                }
              })
              .catch(() => {});
            
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          console.log('🌐 [SW] Network fetch:', url.pathname);
          return fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, responseClone))
                  .catch(() => {});
              }
              return response;
            });
        })
    );
    return;
  }
  
  // ==========================================
  // 🤖 FACE-API Models: Cache First (Heavy files)
  // ==========================================
  if (url.href.includes('face-api') || url.href.includes('weights') || url.href.includes('.bin')) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          return cachedResponse || fetch(request)
            .then(response => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone))
                .catch(() => {});
              return response;
            });
        })
    );
    return;
  }
  
  // ==========================================
  // 🔄 DEFAULT: Network First, Cache Fallback
  // ==========================================
  event.respondWith(
    fetch(request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(request, responseClone))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// 🔔 PUSH NOTIFICATION
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sistem Absensi';
  const options = {
    body: data.body || 'Anda memiliki notifikasi baru',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'absensi-notification',
    requireInteraction: false,
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});

// ============================================
// 📡 BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  console.log('📤 [SW] Syncing pending attendance...');
  
  try {
    // Ambil data dari IndexedDB atau localStorage
    // Kirim ke server
    // Hapus data lokal setelah berhasil
    
    // Contoh implementasi:
    const response = await fetch('/api/sync-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* data */ })
    });
    
    if (response.ok) {
      console.log('✅ [SW] Sync successful');
      
      // Kirim message ke client
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_SUCCESS',
          message: 'Data berhasil disinkronkan'
        });
      });
    }
  } catch (error) {
    console.error('❌ [SW] Sync failed:', error);
    throw error; // Retry sync
  }
}

// ============================================
// 💬 MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  console.log('💬 [SW] Message received:', event.data);
  
  // Force update
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Manual cache update
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  // Clear all caches
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
  
  // Get cache info
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            return {
              name: cacheName,
              size: keys.length
            };
          })
        ).then(info => {
          event.ports[0].postMessage({ cacheInfo: info });
        });
      })
    );
  }
});

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

/**
 * Generate inline offline page
 */
function generateOfflinePage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Sistem Absensi</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    }
    
    .container {
      max-width: 500px;
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    
    p {
      font-size: 1.2rem;
      opacity: 0.95;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    
    button {
      background: white;
      color: #667eea;
      border: none;
      padding: 1rem 2.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .status {
      margin-top: 2rem;
      padding: 1rem;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      font-size: 0.9rem;
    }
    
    .online {
      display: none;
      color: #4ade80;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>Sepertinya Anda sedang offline. Periksa koneksi internet Anda dan coba lagi.</p>
    <button onclick="location.reload()">🔄 Coba Lagi</button>
    
    <div class="status">
      <div class="offline">❌ Offline</div>
      <div class="online">✅ Online - Memuat ulang...</div>
    </div>
  </div>
  
  <script>
    // Auto reload when online
    window.addEventListener('online', () => {
      document.querySelector('.offline').style.display = 'none';
      document.querySelector('.online').style.display = 'block';
      
      setTimeout(() => {
        location.reload();
      }, 1000);
    });
    
    // Update status
    window.addEventListener('offline', () => {
      document.querySelector('.offline').style.display = 'block';
      document.querySelector('.online').style.display = 'none';
    });
  </script>
</body>
</html>`;
}

// ============================================
// ✅ SERVICE WORKER READY
// ============================================
console.log('✅ [SW] Service Worker v' + VERSION + ' loaded successfully');
