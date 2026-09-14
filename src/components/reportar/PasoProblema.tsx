"use client";

import { useEffect, useState } from "react";
import { CATALOGO_TIPOS, type ReportePublico, type Severidad, type TipoProblema } from "@/lib/tipos";
import PosiblesDuplicados from "./PosiblesDuplicados";

type BorradorProblema = { tipo: TipoProblema | null; severidad: Severidad; descripcion: string; referencia: string; colonia: string; sitio_web: string };
type PasoProblemaProps = { borrador: BorradorProblema; latitud: number; longitud: number; alCambiar: (cambios: Partial<BorradorProblema>) => void; alContinuar: () => void; };

export default function PasoProblema({ borrador, latitud, longitud, alCambiar, alContinuar }: PasoProblemaProps) {
  const [duplicado, cambiarDuplicado] = useState<(ReportePublico & { distancia_m?: number }) | null>(null);
  const [mensajeDuplicado, cambiarMensajeDuplicado] = useState("");

  useEffect(() => {
    if (!borrador.tipo) return;
    const buscar = async () => {
      const respuesta = await fetch(`/api/reportes/cercanos?lat=${latitud}&lon=${longitud}&tipo=${borrador.tipo}`);
      if (!respuesta.ok) return;
      const reportes = await respuesta.json() as (ReportePublico & { distancia_m?: number })[];
      cambiarDuplicado(reportes[0] ?? null);
      cambiarMensajeDuplicado("");
    };
    void buscar();
  }, [borrador.tipo, latitud, longitud]);

  return <section className="space-y-4"><div><h2 className="text-2xl font-bold">¿Qué problema viste?</h2><p className="text-slate-700">Elige la opción que mejor lo describa.</p></div>
    <div className="grid grid-cols-3 gap-2">{(Object.entries(CATALOGO_TIPOS) as [TipoProblema, { etiqueta: string; emoji: string }][]).map(([tipo, detalle]) => <button type="button" key={tipo} onClick={() => alCambiar({ tipo })} className={`min-h-24 rounded-xl border-2 px-1 py-2 text-sm font-bold ${borrador.tipo === tipo ? "border-sky-800 bg-sky-200" : "border-slate-300 bg-white"}`}><span className="block text-2xl">{detalle.emoji}</span>{detalle.etiqueta}</button>)}</div>
    {duplicado && !mensajeDuplicado && <PosiblesDuplicados reporte={duplicado} alMismo={() => cambiarMensajeDuplicado(`Gracias. El folio es ${duplicado.folio}; en la siguiente semana podrás confirmarlo.`)} alOtro={() => cambiarDuplicado(null)} />}
    {mensajeDuplicado && <p className="rounded-lg bg-emerald-100 p-3 font-medium text-emerald-950">{mensajeDuplicado}</p>}
    <fieldset><legend className="mb-2 font-bold">Severidad</legend><div className="grid grid-cols-3 gap-2">{(["baja", "media", "alta"] as Severidad[]).map((severidad) => <button type="button" key={severidad} onClick={() => alCambiar({ severidad })} className={`min-h-12 rounded-lg border-2 font-bold ${borrador.severidad === severidad ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300"}`}>{severidad[0].toUpperCase() + severidad.slice(1)}</button>)}</div></fieldset>
    <label className="block font-bold">Descripción opcional<textarea value={borrador.descripcion} onChange={(evento) => alCambiar({ descripcion: evento.target.value.slice(0, 500) })} maxLength={500} className="mt-1 min-h-24 w-full rounded-lg border-2 border-slate-400 p-3 font-normal" /><span className="text-sm font-normal text-slate-600">{borrador.descripcion.length}/500</span></label>
    <label className="block font-bold">Referencia opcional<input value={borrador.referencia} onChange={(evento) => alCambiar({ referencia: evento.target.value.slice(0, 120) })} placeholder="Calle y esquina o punto de referencia" className="mt-1 min-h-12 w-full rounded-lg border-2 border-slate-400 p-3 font-normal" /></label>
    <label className="block font-bold">Colonia opcional<input value={borrador.colonia} onChange={(evento) => alCambiar({ colonia: evento.target.value.slice(0, 120) })} className="mt-1 min-h-12 w-full rounded-lg border-2 border-slate-400 p-3 font-normal" /></label>
    <label className="absolute -left-[9999px]" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={borrador.sitio_web} onChange={(evento) => alCambiar({ sitio_web: evento.target.value })} /></label>
    <button type="button" disabled={!borrador.tipo} onClick={alContinuar} className="min-h-12 w-full rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white disabled:bg-slate-400">Continuar</button>
  </section>;
}
