/* Unbadged service worker: only used to show message alerts. No offline caching. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const room = (e.notification.data || {}).room;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const c = list[0];
    if (c) { c.postMessage({ openRoom: room }); return c.focus(); }
    return self.clients.openWindow("/");
  }));
});
