// Served at /sw.js by `next dev` (see next.config.ts). It replaces any service worker installed earlier,
// deletes its caches, unregisters itself and reloads open tabs once, so dev never runs stale cached JavaScript.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      await self.registration.unregister();
      const tabs = await self.clients.matchAll({ type: "window" });
      tabs.forEach((tab) => tab.navigate(tab.url));
    })(),
  );
});
