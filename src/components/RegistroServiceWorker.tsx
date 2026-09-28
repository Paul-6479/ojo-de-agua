"use client";

import { useEffect } from "react";

// Registra el service worker que permite abrir la app sin señal.
export default function RegistroServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si el navegador lo rechaza (por ejemplo en una ventana privada) la app
      // sigue funcionando normal: solo pierde el modo sin conexión.
    });
  }, []);

  return null;
}
