const CACHE_NAME = 'kingdom-connect-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './crosses_bg.png',
    './favicon.ico',
    './favicon-16x16.png',
    './favicon-32x32.png',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png',
    './apple-touch-icon.png',
    './site.webmanifest'
];

// Install Event - Cache all structural files
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Serve assets from Cache when offline, and update Cache when online
self.addEventListener('fetch', (e) => {
    // Only cache requests from our own origin
    if (e.request.url.startsWith(self.location.origin)) {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    // Save latest response clone in cache
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Network failed, serve from cache
                    return caches.match(e.request);
                })
        );
    } else {
        // External libraries (e.g. Tesseract OCR, FontAwesome, Google Fonts)
        // Check cache first, if missing fetch from network
        e.respondWith(
            caches.match(e.request).then((cachedResponse) => {
                return cachedResponse || fetch(e.request);
            })
        );
    }
});
