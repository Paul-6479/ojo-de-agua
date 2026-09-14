"use client";

import { useMemo, useState } from "react";
import Filtros, {
  esEstatusAbierto,
  type FiltroEstatus,
  type FiltroTipo,
} from "@/components/Filtros";
import Mapa from "@/components/Mapa";
import { REPORTES_EJEMPLO } from "@/lib/datosEjemplo";

// Toda la página es un componente de cliente porque los filtros y el mapa
// reaccionan al toque sin recargar. En la semana 2 los datos vendrán de Supabase.
export default function Inicio() {
  const [estatusSeleccionado, cambiarEstatus] = useState<FiltroEstatus>("todos");
  const [tipoSeleccionado, cambiarTipo] = useState<FiltroTipo>("todos");

  const reportesFiltrados = useMemo(() => {
    return REPORTES_EJEMPLO.filter((reporte) => {
      const abierto = esEstatusAbierto(reporte.estatus);
      const coincideEstatus =
        estatusSeleccionado === "todos" ||
        (estatusSeleccionado === "abiertos" ? abierto : !abierto);
      const coincideTipo =
        tipoSeleccionado === "todos" || reporte.tipo === tipoSeleccionado;
      return coincideEstatus && coincideTipo;
    });
  }, [estatusSeleccionado, tipoSeleccionado]);

  return (
    <main className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="z-10 bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">💧 Ojo de Agua</h1>
            <p className="text-xs text-sky-100">
              Reporte ciudadano del agua · Zona conurbada de Tampico
            </p>
          </div>
          <a
            href="/reportar"
            className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-sky-950"
          >
            Reportar
          </a>
        </div>
      </header>

      <Filtros
        estatusSeleccionado={estatusSeleccionado}
        tipoSeleccionado={tipoSeleccionado}
        alCambiarEstatus={cambiarEstatus}
        alCambiarTipo={cambiarTipo}
      />

      <section className="relative min-h-[420px] flex-1">
        <Mapa reportes={reportesFiltrados} />
        <p className="absolute left-3 top-3 rounded-full bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow">
          {reportesFiltrados.length} reportes · datos de ejemplo
        </p>
      </section>

      <footer className="bg-sky-950 px-4 py-3 text-center text-xs text-sky-100">
        Proyecto ciudadano independiente. No es un canal oficial de COMAPA ni de
        ningún organismo público.{" "}
        <a className="underline" href="/privacidad">
          Aviso de privacidad
        </a>
      </footer>
    </main>
  );
}
