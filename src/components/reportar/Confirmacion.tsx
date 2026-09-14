"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guardarFolioReciente } from "@/lib/dispositivo";

export default function Confirmacion({ folio, publicado, mensaje }: { folio: string; publicado: boolean; mensaje?: string }) {
  const [copiado, cambiarCopiado] = useState(false);
  useEffect(() => { guardarFolioReciente(folio); }, [folio]);
  const copiar = async () => { await navigator.clipboard.writeText(folio); cambiarCopiado(true); };
  return <section className="space-y-5 text-center"><p className="text-lg font-bold text-emerald-800">Reporte guardado</p><h2 className="text-3xl font-black tracking-wide text-sky-950">{folio}</h2>
    {mensaje && <p className="rounded-xl bg-amber-100 p-4 text-left font-medium text-amber-950">{mensaje}</p>}
    <button type="button" onClick={() => void copiar()} className="min-h-12 w-full rounded-xl border-2 border-sky-900 px-5 py-3 text-lg font-bold">{copiado ? "Folio copiado" : "Copiar folio"}</button>
    <p>Guarda este folio para seguir tu reporte.</p>{publicado && <Link href="/" className="block min-h-12 rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white">Ver en el mapa</Link>}
  </section>;
}
