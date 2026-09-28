"use client";

import { obtenerTokenDispositivo, guardarFolioReciente } from "@/lib/dispositivo";

const CLAVE_COLA = "ojo_cola_reportes";
const EVENTO_COLA = "ojo-cola-cambio";

// Un reporte en espera de señal. Las fotos NO se guardan: un Blob no cabe en
// localStorage y convertirlo a texto haría que un par de fotos llenen la cuota
// del navegador. Se avisa al usuario y el reporte se envía sin foto.
export type ReportePendiente = {
  idLocal: string;
  guardadoEn: string;
  datos: Record<string, unknown>;
};

export function leerCola(): ReportePendiente[] {
  try {
    const crudo = localStorage.getItem(CLAVE_COLA);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarCola(cola: ReportePendiente[]) {
  localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  window.dispatchEvent(new Event(EVENTO_COLA));
}

export function encolarReporte(datos: Record<string, unknown>) {
  const cola = leerCola();
  cola.push({
    idLocal: crypto.randomUUID(),
    guardadoEn: new Date().toISOString(),
    datos,
  });
  guardarCola(cola.slice(-20));
}

export type ResultadoSincronizacion = { enviados: number; pendientes: number };

// Reintenta la cola completa. Un reporte que el servidor rechaza por datos
// inválidos se descarta: reintentarlo para siempre no lo va a arreglar.
export async function sincronizarCola(): Promise<ResultadoSincronizacion> {
  const cola = leerCola();
  if (cola.length === 0) return { enviados: 0, pendientes: 0 };

  const quedan: ReportePendiente[] = [];
  let enviados = 0;

  for (const pendiente of cola) {
    try {
      const respuesta = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendiente.datos, token: obtenerTokenDispositivo() }),
      });
      const resultado = await respuesta.json().catch(() => null);

      if (respuesta.ok && resultado?.ok) {
        enviados += 1;
        if (typeof resultado.folio === "string") guardarFolioReciente(resultado.folio);
        continue;
      }
      // 4xx = el reporte está mal y no va a mejorar; 5xx o red = se reintenta.
      if (respuesta.status >= 400 && respuesta.status < 500 && respuesta.status !== 429) continue;
      quedan.push(pendiente);
    } catch {
      quedan.push(pendiente);
    }
  }

  guardarCola(quedan);
  return { enviados, pendientes: quedan.length };
}

export function suscribirCola(avisar: () => void) {
  window.addEventListener(EVENTO_COLA, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_COLA, avisar);
    window.removeEventListener("storage", avisar);
  };
}
