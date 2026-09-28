"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FechaEstimada({
  reporteId,
  fechaActual,
  puedeComprometer,
}: {
  reporteId: string;
  fechaActual: string | null;
  puedeComprometer: boolean;
}) {
  const router = useRouter();
  const [fecha, cambiarFecha] = useState(fechaActual ?? "");
  const [nota, cambiarNota] = useState("");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  const guardar = async () => {
    if (!fecha) return;
    cambiarEnviando(true);
    cambiarError("");
    try {
      const respuesta = await fetch("/api/panel/fecha-estimada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteId, fecha, nota }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo guardar la fecha.");
        return;
      }
      cambiarNota("");
      router.refresh();
    } catch {
      cambiarError("No se pudo guardar la fecha. Revisa tu conexión.");
    } finally {
      cambiarEnviando(false);
    }
  };

  if (!puedeComprometer) {
    return (
      <section className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
        Solo un operador de COMAPA puede comprometer una fecha de resolución.
        {fechaActual && (
          <span className="font-semibold"> Fecha actual: {new Date(fechaActual).toLocaleDateString("es-MX")}.</span>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold text-sky-950">Fecha comprometida</h2>
      {/* Es el único campo que la ficha pública puede llamar "fecha comprometida":
          viene de una persona de COMAPA, no de una estimación inventada (§7.3). */}
      <p className="text-sm text-slate-600">
        Se publica en la ficha del reporte etiquetada como compromiso de COMAPA. No la fijes si no hay
        una fecha real.
      </p>
      <input
        type="date"
        value={fecha}
        onChange={(evento) => cambiarFecha(evento.target.value)}
        className="min-h-12 rounded-xl border-2 border-slate-300 px-3 text-lg"
      />
      <input
        type="text"
        maxLength={200}
        value={nota}
        onChange={(evento) => cambiarNota(evento.target.value)}
        placeholder="Nota opcional (ej.: sujeto a disponibilidad de material)"
        className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
      />
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!fecha || enviando}
        onClick={() => void guardar()}
        className="min-h-12 w-full rounded-xl bg-sky-800 px-4 font-bold text-white disabled:bg-slate-400"
      >
        {enviando ? "Guardando…" : "Comprometer esta fecha"}
      </button>
    </section>
  );
}
