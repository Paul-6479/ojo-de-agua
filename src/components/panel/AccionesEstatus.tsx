"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATALOGO_ESTATUS, TRANSICIONES, type EstatusReporte } from "@/lib/tipos";

export default function AccionesEstatus({
  reporteId,
  estatusActual,
  tieneEvidencia,
}: {
  reporteId: string;
  estatusActual: EstatusReporte;
  tieneEvidencia: boolean;
}) {
  const router = useRouter();
  const posibles = TRANSICIONES[estatusActual] ?? [];
  const [estatusNuevo, cambiarEstatusNuevo] = useState<EstatusReporte | "">("");
  const [nota, cambiarNota] = useState("");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  const guardar = async () => {
    if (!estatusNuevo) return;
    cambiarEnviando(true);
    cambiarError("");
    try {
      const respuesta = await fetch("/api/panel/estatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteId, estatusNuevo, nota }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo cambiar el estatus.");
        return;
      }
      cambiarNota("");
      cambiarEstatusNuevo("");
      router.refresh();
    } catch {
      cambiarError("No se pudo cambiar el estatus. Revisa tu conexión.");
    } finally {
      cambiarEnviando(false);
    }
  };

  if (posibles.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-4 text-slate-600 shadow-sm">
        Este reporte no admite más cambios de estatus.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold text-sky-950">Cambiar estatus</h2>
      <div className="flex flex-wrap gap-2">
        {posibles.map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => cambiarEstatusNuevo(opcion)}
            className={`min-h-11 rounded-xl px-4 font-bold ${
              estatusNuevo === opcion ? "text-white" : "bg-slate-100 text-slate-800"
            }`}
            style={estatusNuevo === opcion ? { backgroundColor: CATALOGO_ESTATUS[opcion].color } : undefined}
          >
            {CATALOGO_ESTATUS[opcion].etiqueta}
          </button>
        ))}
      </div>

      {estatusNuevo === "cerrado" && !tieneEvidencia && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
          Para cerrar hace falta subir abajo una foto del trabajo terminado.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="nota" className="block text-sm font-bold">
          Nota para la bitácora <span className="font-normal text-slate-500">(la ve el público)</span>
        </label>
        <textarea
          id="nota"
          rows={3}
          maxLength={500}
          value={nota}
          onChange={(evento) => cambiarNota(evento.target.value)}
          placeholder="Ej.: Cuadrilla 4 asignada, se repone tramo de tubería de 2 pulgadas."
          className="w-full rounded-xl border-2 border-slate-300 p-3"
        />
      </div>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      <button
        type="button"
        disabled={!estatusNuevo || enviando}
        onClick={() => void guardar()}
        className="min-h-12 w-full rounded-xl bg-sky-800 px-4 font-bold text-white disabled:bg-slate-400"
      >
        {enviando ? "Guardando…" : "Guardar cambio de estatus"}
      </button>
    </section>
  );
}
