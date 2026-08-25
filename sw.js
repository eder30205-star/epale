self.addEventListener("install", function(e) { self.skipWaiting(); });
self.addEventListener("activate", function(e) { e.waitUntil(clients.claim()); });

self.addEventListener("fetch", function(e) {
  e.respondWith(
    fetch(e.request).catch(function() { return caches.match(e.request); })
  );
});

self.addEventListener("push", function(e) {
  var data = { title: "Épale", body: "Tienes una notificación nueva 🇻🇪" };
  try { if (e.data) data = e.data.json(); } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || "Épale", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) return list[i].focus();
      }
      return clients.openWindow(e.notification.data.url || "/");
    })
  );
});
