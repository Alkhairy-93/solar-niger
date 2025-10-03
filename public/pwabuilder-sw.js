// Service Worker pour SolarNiger - Solutions Solaires
const CACHE_NAME = 'solar-niger-v1.2';
const OFFLINE_PAGE = '/offline.html';

// Fichiers à mettre en cache lors de l'installation
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2',
  'https://identity.netlify.com/v1/netlify-identity-widget.js',
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker SolarNiger: Installation en cours');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources statiques');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker SolarNiger: Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker SolarNiger: Erreur lors de l\'installation', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker SolarNiger: Activation en cours');
  
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
      console.log('Service Worker SolarNiger: Activation terminée');
      return self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Pour les requêtes de navigation (pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Mettre à jour le cache avec la nouvelle réponse
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // En cas d'échec, chercher dans le cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Si pas dans le cache, retourner la page offline
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // Pour les autres ressources (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retourner la ressource depuis le cache si disponible
        if (cachedResponse) {
          return cachedResponse;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Mettre en cache la nouvelle ressource
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Pour les images, retourner une image de remplacement si disponible
            if (event.request.destination === 'image') {
              return caches.match('https://images.unsplash.com/photo-1509391366360-2e959784a276?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80');
            }
            
            // Pour les CSS, retourner une réponse vide
            if (event.request.destination === 'style') {
              return new Response('', { 
                headers: { 'Content-Type': 'text/css' }
              });
            }
            
            // Pour les autres types de ressources, retourner une réponse d'erreur
            return new Response('Ressource non disponible hors ligne', {
              status: 408,
              statusText: 'Hors ligne',
              headers: new Headers({
                'Content-Type': 'text/html'
              })
            });
          });
      })
  );
});

// Gestion des messages (pour la mise à jour de l'application)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker SolarNiger: Synchronisation en arrière-plan');
    event.waitUntil(doBackgroundSync());
  }
});

// Fonction pour la synchronisation en arrière-plan
function doBackgroundSync() {
  // Synchroniser les données du panier si nécessaire
  return caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Synchronisation des données en arrière-plan');
      return Promise.resolve();
    });
}

// Gestion des notifications push (pour les futures fonctionnalités)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nouvelle notification de SolarNiger',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'solar-niger-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SolarNiger', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});