const CACHE_NAME = 'mptech-v1';
const urlsToCache = [
    '/',
    '/static/images/icon-192x192.png',
    '/static/images/icon-512x512.png'
];

// Instalar el Service Worker y guardar recursos básicos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Interceptar peticiones (Estrategia: Primero red, luego caché)
self.addEventListener('fetch', event => {
    // Solo interceptar peticiones GET de nuestro propio origen para evitar fallos con extensiones o URLs externas
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(error => {
            return caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                // Si falla la red y no está en caché, devolvemos un error de red nativo (Response.error())
                // en vez de lanzar una excepción, evitando "Failed to convert value to 'Response'" en sw.js.
                return Response.error();
            });
        })
    );
});

// Limpiar cachés antiguos si actualizas la versión
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});