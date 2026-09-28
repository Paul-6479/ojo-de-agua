// Service worker mínimo y deliberadamente conservador.
// Regla: la red manda. Solo se sirve algo del caché cuando la red falla, para no
// mostrar cifras viejas en la portada ni un mapa con reportes de ayer.
const CACHE = "ojo-de-agua-v1";
const PARA_OFFLINE = ["/offline", "/reportar"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PARA_OFFLINE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const solicitud = evento.request;
  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;
  // Nunca cachear las rutas de API: son datos vivos.
  if (url.pathname.startsWith("/api/")) return;

  if (solicitud.mode === "navigate") {
    evento.respondWith(
      fetch(solicitud)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(solicitud, copia));
          return respuesta;
        })
        .catch(async () => {
          const guardada = await caches.match(solicitud);
          return guardada ?? caches.match("/offline");
        }),
    );
    return;
  }

  // Recursos estáticos (JS, CSS, teselas propias): caché como respaldo.
  evento.respondWith(
    fetch(solicitud)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(solicitud, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(solicitud)),
  );
});
