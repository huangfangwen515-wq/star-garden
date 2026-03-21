const CACHE_NAME = 'star-garden-v' + Date.now(); // 使用时间戳作为版本，确保每次都不同
const urlsToCache = [
  './',
  './index.html',
  './scene_3d.js',
  './manifest.json'
];

// 安装阶段：强制跳过等待
self.addEventListener('install', event => {
  self.skipWaiting(); // 关键：发现新版直接安装，不要等
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 激活阶段：清理所有旧宇宙的残骸
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 关键：立即接管所有页面
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
