// HOBI.haus — Service Worker
// วางไฟล์นี้ไว้ในโฟลเดอร์เดียวกับ index.html (โฟลเดอร์เดียวกันบน GitHub)
// ทำหน้าที่: (1) ทำให้เว็บเป็น "แอพติดตั้งได้" (installable PWA) จริง ๆ บน Android
//            ซึ่งจะทำให้ไอคอนหน้าจอโฮมไม่มีตราสัญลักษณ์ Chrome เล็ก ๆ ติดมุมล่างขวา
//            (ตรานั้นจะโผล่มาเฉพาะตอนที่เบราว์เซอร์มองว่าเป็นแค่ "shortcut" ไม่ใช่แอพที่ติดตั้งจริง)
//        (2) แคชไฟล์ CDN หลัก ๆ ไว้ ทำให้เปิดแอพครั้งต่อ ๆ ไปเร็วขึ้นมาก และเปิดได้แม้เน็ตหลุดชั่วคราว

const CACHE_NAME = 'hobi-app-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // ข้อมูล Cloud Sync (Firebase) ต้องสดใหม่เสมอ ไม่แคช
  const url = req.url;
  if (
    url.includes('firebaseio.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com/firebasejs')
  ) {
    return; // ปล่อยผ่านไปที่เน็ตเวิร์กตามปกติ ไม่ intercept
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
      // มีแคช -> ส่งแคชทันที (เร็ว) แล้วค่อยอัพเดทแคชเบื้องหลัง
      // ไม่มีแคช -> รอเน็ตเวิร์ก
      return cached || network;
    })
  );
});
