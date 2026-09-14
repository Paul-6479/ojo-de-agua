import { CATALOGO_TIPOS, type ReportePublico } from "@/lib/tipos";
import { useState } from "react";

type PosiblesDuplicadosProps = { reporte: ReportePublico & { distancia_m?: number }; alMismo: () => void; alOtro: () => void };

export default function PosiblesDuplicados({ reporte, alMismo, alOtro }: PosiblesDuplicadosProps) {
  const [ahora] = useState(() => Date.now());
  const dias = Math.max(0, Math.floor((ahora - new Date(reporte.creado_en).getTime()) / 86_400_000));
  return <aside className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-slate-900">
    <h3 className="font-bold">Posible reporte duplicado</h3>
    <p className="mt-1">Ya hay un reporte de {CATALOGO_TIPOS[reporte.tipo].etiqueta.toLowerCase()} a {Math.round(reporte.distancia_m ?? 0)} m desde hace {dias} días ({reporte.folio}). ¿Es el mismo problema?</p>
    <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={alMismo} className="min-h-12 rounded-lg bg-amber-700 px-2 font-bold text-white">Sí, es el mismo</button><button type="button" onClick={alOtro} className="min-h-12 rounded-lg border-2 border-amber-800 px-2 font-bold">No, es otro</button></div>
  </aside>;
}
