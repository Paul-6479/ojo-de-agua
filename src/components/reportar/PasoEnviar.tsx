/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { CATALOGO_TIPOS, type Severidad, type TipoProblema } from "@/lib/tipos";
import { comprimirFoto } from "@/lib/foto";

export type FotoPreparada = { archivo: Blob; vista: string; tamano: number };
type PasoEnviarProps = { tipo: TipoProblema; severidad: Severidad; descripcion: string; referencia: string; colonia: string; fotos: FotoPreparada[]; alCambiarFotos: (fotos: FotoPreparada[]) => void; alEnviar: () => void; enviando: boolean; };

export default function PasoEnviar({ tipo, severidad, descripcion, referencia, colonia, fotos, alCambiarFotos, alEnviar, enviando }: PasoEnviarProps) {
  const [errorFoto, cambiarErrorFoto] = useState("");
  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos) return;
    try {
      const disponibles = Array.from(archivos).slice(0, 3 - fotos.length);
      const nuevas = await Promise.all(disponibles.map(async (archivo) => {
        const comprimida = await comprimirFoto(archivo);
        return { archivo: comprimida, vista: URL.createObjectURL(comprimida), tamano: comprimida.size };
      }));
      alCambiarFotos([...fotos, ...nuevas]); cambiarErrorFoto("");
    } catch { cambiarErrorFoto("No pudimos preparar una de las fotos."); }
  };
  const quitarFoto = (indice: number) => { URL.revokeObjectURL(fotos[indice].vista); alCambiarFotos(fotos.filter((_, posicion) => posicion !== indice)); };
  return <section className="space-y-4"><div><h2 className="text-2xl font-bold">Foto y envío</h2><p className="text-slate-700">Una foto ayuda a entender el problema; es opcional.</p></div>
    <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-sky-800 bg-sky-50 p-3 text-center font-bold text-sky-950">Agregar fotos ({fotos.length}/3)<input type="file" accept="image/*" capture="environment" multiple disabled={fotos.length >= 3} onChange={(evento) => { void agregarFotos(evento.target.files); evento.currentTarget.value = ""; }} className="sr-only" /></label>
    {errorFoto && <p className="rounded-lg bg-rose-100 p-3 text-rose-950">{errorFoto}</p>}
    <div className="grid grid-cols-3 gap-2">{fotos.map((foto, indice) => <div key={foto.vista} className="relative">{/* La vista previa usa una URL local que next/image no puede optimizar. */}<img src={foto.vista} alt={`Foto ${indice + 1}`} className="h-24 w-full rounded-lg object-cover" /><p className="text-center text-xs">{Math.round(foto.tamano / 1024)} KB</p><button type="button" onClick={() => quitarFoto(indice)} className="absolute right-1 top-1 rounded bg-white px-2 py-1 text-xs font-bold">Quitar</button></div>)}</div>
    <article className="rounded-xl bg-slate-100 p-4"><h3 className="font-bold">Resumen</h3><p>{CATALOGO_TIPOS[tipo].emoji} {CATALOGO_TIPOS[tipo].etiqueta} · severidad {severidad}</p>{descripcion && <p>{descripcion}</p>}{referencia && <p>Referencia: {referencia}</p>}{colonia && <p>Colonia: {colonia}</p>}</article>
    <button type="button" disabled={enviando} onClick={alEnviar} className="min-h-12 w-full rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white disabled:bg-slate-400">{enviando ? "Enviando…" : "Enviar reporte"}</button>
  </section>;
}
