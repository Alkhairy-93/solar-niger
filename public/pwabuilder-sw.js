// Service Worker for SolarNiger PWA
const CACHE_NAME = 'solar-niger-v2.1.0';
const OFFLINE_PAGE = 'offline.html';

// Assets to cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles/main.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2'
];

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources critiques');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de l\'installation', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation en cours...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation terminée');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to cache it
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // No cached response, return offline page
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // Handle API requests and other resources
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // For images, return a placeholder if available
            if (event.request.destination === 'image') {
              return caches.match('/icons/icon-192x192.png');
            }
            
            // For CSS and JS, return cached version if available
            if (event.request.destination === 'style' || event.request.destination === 'script') {
              return caches.match(event.request);
            }
            
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Synchronisation en arrière-plan');
    event.waitUntil(doBackgroundSync());
  }
});

// Periodic sync for updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-update') {
    console.log('Service Worker: Mise à jour périodique du contenu');
    event.waitUntil(updateContent());
  }
});

// Background sync implementation
function doBackgroundSync() {
  return new Promise((resolve) => {
    // Implémentez ici la synchronisation des données en arrière-plan
    console.log('Synchronisation des données...');
    resolve();
  });
}

// Content update implementation
function updateContent() {
  return new Promise((resolve) => {
    // Implémentez ici la mise à jour du contenu
    console.log('Mise à jour du contenu...');
    resolve();
  });
}

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: '2.1.0',
      timestamp: new Date().toISOString()
    });
  }
});