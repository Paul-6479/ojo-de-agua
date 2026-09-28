"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guardarFolioReciente } from "@/lib/dispositivo";

export default function Confirmacion({ folio, publicado, mensaje, pendiente = false }: { folio: string; publicado: boolean; mensaje?: string; pendiente?: boolean }) {
  const [copiado, cambiarCopiado] = useState(false);
  // Un reporte que aún no llegó al servidor no tiene folio: no hay nada que guardar.
  useEffect(() => { if (!pendiente && folio) guardarFolioReciente(folio); }, [folio, pendiente]);
  const copiar = async () => { await navigator.clipboard.writeText(folio); cambiarCopiado(true); };
  if (pendiente) {
    return <section className="space-y-4 text-center">
      <p className="text-lg font-bold text-amber-800">Reporte guardado en tu teléfono</p>
      <p className="rounded-xl bg-amber-100 p-4 text-left font-medium text-amber-950">
        {mensaje ?? "No hay señal. Tu reporte se enviará solo en cuanto vuelva el internet; no cierres la app antes de eso si puedes evitarlo."}
      </p>
      <p className="text-sm text-slate-700">Cuando se envíe recibirás su folio en la lista de <span className="font-bold">tus reportes recientes</span>.</p>
      <Link href="/seguir" className="block min-h-12 rounded-xl border-2 border-sky-800 px-5 py-3 text-lg font-bold text-sky-900">Ver mis reportes</Link>
    </section>;
  }

  return <section className="space-y-5 text-center"><p className="text-lg font-bold text-emerald-800">Reporte guardado</p><h2 className="text-3xl font-black tracking-wide text-sky-950">{folio}</h2>
    {mensaje && <p className="rounded-xl bg-amber-100 p-4 text-left font-medium text-amber-950">{mensaje}</p>}
    <button type="button" onClick={() => void copiar()} className="min-h-12 w-full rounded-xl border-2 border-sky-900 px-5 py-3 text-lg font-bold">{copiado ? "Folio copiado" : "Copiar folio"}</button>
    <p>Guarda este folio para seguir tu reporte.</p>{publicado && <Link href={`/reporte/${folio}`} className="block min-h-12 rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white">Ver mi reporte</Link>}
    {publicado && <Link href="/" className="block min-h-12 rounded-xl border-2 border-sky-800 px-5 py-3 text-lg font-bold text-sky-900">Ver en el mapa</Link>}
  </section>;
}
