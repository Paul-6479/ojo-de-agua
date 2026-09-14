"use client";

import { useState } from "react";
import { guardarListaLocal, obtenerTokenDispositivo, useListaLocal } from "@/lib/dispositivo";
import type { EstatusReporte } from "@/lib/tipos";

type TipoConfirmacion = "afectado" | "resuelto";

const CLAVE_CONFIRMADOS = "ojo_confirmados";

export default function BotonYoTambien({
  reporteId,
  confirmacionesIniciales,
  estatus,
}: {
  reporteId: string;
  confirmacionesIniciales: number;
  estatus: EstatusReporte;
}) {
  const [confirmaciones, cambiarConfirmaciones] = useState(confirmacionesIniciales);
  // Lista "reporteId:tipo" de lo que ya se confirmó desde este teléfono.
  const confirmados = useListaLocal(CLAVE_CONFIRMADOS);
  const [enviando, cambiarEnviando] = useState<TipoConfirmacion | null>(null);
  const [error, cambiarError] = useState("");

  const confirmar = async (tipo: TipoConfirmacion) => {
    cambiarEnviando(tipo);
    cambiarError("");
    try {
      const respuesta = await fetch(`/api/reportes/${reporteId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: obtenerTokenDispositivo(), tipo }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo guardar tu confirmación.");
        return;
      }

      if (typeof datos.confirmaciones === "number") cambiarConfirmaciones(datos.confirmaciones);
      const clave = `${reporteId}:${tipo}`;
      guardarListaLocal(CLAVE_CONFIRMADOS, [...new Set([...confirmados, clave])]);
    } catch {
      cambiarError("No se pudo guardar tu confirmación. Revisa tu conexión e intenta de nuevo.");
    } finally {
      cambiarEnviando(null);
    }
  };

  const yaConfirmo = (tipo: TipoConfirmacion) => confirmados.includes(`${reporteId}:${tipo}`);
  const noAdmiteConfirmaciones = estatus === "rechazado" || estatus === "duplicado";

  return (
    <section className="space-y-3 rounded-2xl bg-sky-50 p-4">
      <p className="font-bold text-sky-950">{confirmaciones} vecinos también lo reportan</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={noAdmiteConfirmaciones || enviando !== null || yaConfirmo("afectado")}
          onClick={() => void confirmar("afectado")}
          className="min-h-12 rounded-xl bg-sky-800 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {yaConfirmo("afectado") ? "Gracias, ya contamos tu confirmación" : enviando === "afectado" ? "Guardando…" : "Yo también me afecta"}
        </button>
        <button
          type="button"
          disabled={noAdmiteConfirmaciones || enviando !== null || yaConfirmo("resuelto")}
          onClick={() => void confirmar("resuelto")}
          className="min-h-12 rounded-xl border-2 border-emerald-700 px-4 py-3 font-bold text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-500"
        >
          {yaConfirmo("resuelto") ? "Gracias, ya contamos tu confirmación" : enviando === "resuelto" ? "Guardando…" : "Ya la arreglaron"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}
