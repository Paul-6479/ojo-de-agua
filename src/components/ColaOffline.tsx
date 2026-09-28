"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { leerCola, sincronizarCola, suscribirCola } from "@/lib/colaOffline";

function usePendientes() {
  // Igual que useListaLocal: leer localStorage durante el render no está permitido.
  return useSyncExternalStore(
    suscribirCola,
    () => leerCola().length,
    () => 0,
  );
}

// Muestra los reportes que esperan señal y los reintenta cuando vuelve la red.
export default function ColaOffline() {
  const pendientes = usePendientes();
  const [mensaje, cambiarMensaje] = useState("");
  const [sincronizando, cambiarSincronizando] = useState(false);

  const reintentar = async () => {
    cambiarSincronizando(true);
    try {
      const resultado = await sincronizarCola();
      if (resultado.enviados > 0) {
        cambiarMensaje(
          `Se enviaron ${resultado.enviados} ${resultado.enviados === 1 ? "reporte" : "reportes"} que estaban en espera.`,
        );
      }
    } finally {
      cambiarSincronizando(false);
    }
  };

  useEffect(() => {
    // Al recuperar señal el navegador dispara "online": ese es el momento de
    // vaciar la cola sin que el usuario haga nada.
    const alVolverLaSenal = () => void reintentar();
    window.addEventListener("online", alVolverLaSenal);

    // El primer intento se aplaza un instante: así la página termina de pintarse
    // antes de tocar la red, y el reintento no ocurre dentro del efecto.
    const temporizador = window.setTimeout(() => {
      if (navigator.onLine && leerCola().length > 0) void reintentar();
    }, 0);

    return () => {
      window.removeEventListener("online", alVolverLaSenal);
      window.clearTimeout(temporizador);
    };
    // Se registra una sola vez: reintentar() no depende de ningún estado de React.
  }, []);

  if (pendientes === 0 && !mensaje) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950"
    >
      {pendientes > 0 ? (
        <>
          <p>
            {pendientes} {pendientes === 1 ? "reporte guardado" : "reportes guardados"} en este teléfono
            esperando señal. Se envían solos cuando vuelva el internet.
          </p>
          <button
            type="button"
            disabled={sincronizando}
            onClick={() => void reintentar()}
            className="mt-2 min-h-10 rounded-lg bg-amber-900 px-3 font-bold text-white disabled:bg-slate-400"
          >
            {sincronizando ? "Intentando…" : "Intentar ahora"}
          </button>
        </>
      ) : (
        <p>{mensaje}</p>
      )}
    </div>
  );
}
