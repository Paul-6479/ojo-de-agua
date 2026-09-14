"use client";

import MapaSeleccion from "./MapaSeleccion";

type PasoUbicacionProps = {
  latitud: number;
  longitud: number;
  precision: number | null;
  aviso: string | null;
  alMoverPin: (latitud: number, longitud: number) => void;
  alContinuar: () => void;
};

export default function PasoUbicacion({ latitud, longitud, precision, aviso, alMoverPin, alContinuar }: PasoUbicacionProps) {
  return <section className="space-y-4">
    <div><h2 className="text-2xl font-bold">¿Dónde está el problema?</h2><p className="mt-1 text-slate-700">El GPS puede fallar por 20–50 m: arrastra el pin hasta la esquina exacta.</p></div>
    {aviso && <p className="rounded-lg bg-amber-100 p-3 font-medium text-amber-950">{aviso}</p>}
    <MapaSeleccion latitud={latitud} longitud={longitud} alMoverPin={alMoverPin} />
    {precision !== null && <p className="text-sm text-slate-700">Precisión aproximada del GPS: {Math.round(precision)} m.</p>}
    <button type="button" onClick={alContinuar} className="min-h-12 w-full rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white">Continuar</button>
  </section>;
}
