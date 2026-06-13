// Service Worker — 学习计时器
// 提供离线缓存能力，让 App 无网络也能打开

const CACHE_NAME = 'study-timer-v1';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/timer.js',
  '/js/stats.js',
  '/js/calendar.js',
  '/js/reminder.js',
  '/js/app.js',
  '/manifest.json'
];

// 安装：预缓存所有文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ==================== 通知管理 ====================

// 存储活跃的通知引用
const activeNotifications = new Map();

// 接收来自页面的消息
self.addEventListener('message', event => {
  const data = event.data;

  if (data.type === 'showNotification') {
    // 显示/更新计时通知
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'study-timer',
      requireInteraction: true,
      silent: true,
      icon: 'data:image/svg+xml,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#4CAF50"/><circle cx="50" cy="50" r="32" fill="none" stroke="white" stroke-width="5"/><line x1="50" y1="50" x2="50" y2="28" stroke="white" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="50" x2="62" y2="58" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>')
    }).then(notification => {
      if (data.id) {
        activeNotifications.set(data.id, notification);
      }
    }).catch(err => {
      console.log('Notification error:', err);
    });
  } else if (data.type === 'closeNotification') {
    // 关闭指定通知
    const notification = activeNotifications.get(data.id);
    if (notification) {
      notification.close();
      activeNotifications.delete(data.id);
    }
  }
});

// 用户点击通知 → 回到 App
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      // 如果已有打开的窗口，聚焦它
      const existing = clientsArr.find(c => c.url.includes(self.registration.scope));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'notificationClicked' });
      } else {
        // 否则打开新窗口
        clients.openWindow(self.registration.scope);
      }
    })
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // 如果请求的是页面，返回缓存的 index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
