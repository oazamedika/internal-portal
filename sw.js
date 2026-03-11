const CACHE_NAME = 'oaza-portal-v1';

// Core shell files to cache on install
const SHELL_URLS = [
  '/internal-portal/',
  '/internal-portal/index.html',
  '/internal-portal/dashboard.html',
  '/internal-portal/work-hours.html',
  '/internal-portal/tasks.html',
  '/internal-portal/shifts.html',
  '/internal-portal/reports.html',
  '/internal-portal/confirm-email.html',
  '/internal-portal/reset-password.html',
  '/internal-portal/manifest.json',
  '/internal-portal/favicon.ico',
  '/internal-portal/favicon-96x96.png',
  '/internal-portal/web-app-manifest-192x192.png',
  '/internal-portal/web-app-manifest-512x512.png',
  '/internal-portal/logo_header.png',
  '/internal-portal/logo_long_reports.png',
  '/internal-portal/fzom.png',
  '/internal-portal/helio.png'
];

// Install — cache the shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network first, fall back to cache
// Supabase API calls always go network-only (never cache auth/data)
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never intercept Supabase, Google Fonts, CDN calls
  if (
    url.includes('supabase.co') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('cdnjs.cloudflare.com')
  ) {
    return; // Let browser handle it normally
  }

  // For same-origin HTML/assets: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Cache a fresh copy on successful network response
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed — serve from cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // If it's a navigation request and nothing cached, show index
          if (event.request.mode === 'navigate') {
            return caches.match('/internal-portal/index.html');
          }
          return new Response('Офлајн – нема кеширана верзија.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
