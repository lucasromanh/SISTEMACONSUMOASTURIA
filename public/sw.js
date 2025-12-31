const CACHE_NAME = 'hotel-asturias-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Ignorar requests de navegación para permitir que React Router maneje las rutas
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/index.html');
            })
        );
        return;
    }

    // Ignorar requests a Google Analytics
    if (event.request.url.includes('google-analytics.com') || 
        event.request.url.includes('analytics.js')) {
        return;
    }

    // Para assets estáticos, usar cache
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch((error) => {
                    // Si falla el fetch y es un documento, devolver index.html
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                    throw error;
                });
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
