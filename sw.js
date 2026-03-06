self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Biarkan kosong untuk sekadar memancing browser agar memunculkan tombol install
});
