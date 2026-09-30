// Service Worker for GATE 2027 Management System
const CACHE_NAME = 'gate2027-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let browser handle navigation and network requests normally
  if (event.request.method !== 'GET') return;
  // Ignore firebase/google auth requests to prevent caching issues
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('identitytoolkit')
  ) {
    return;
  }
});
