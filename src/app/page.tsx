"use client";

import { useEffect, useMemo, useState } from "react";
import Filtros, {
  esEstatusAbierto,
  type FiltroEstatus,
  type FiltroTipo,
} from "@/components/Filtros";
import Mapa from "@/components/Mapa";
import PieDeslinde from "@/components/PieDeslinde";
import { REPORTES_EJEMPLO } from "@/lib/datosEjemplo";
import type { ReportePublico } from "@/lib/tipos";

export default function Inicio() {
  const [estatusSeleccionado, cambiarEstatus] = useState<FiltroEstatus>("todos");
  const [tipoSeleccionado, cambiarTipo] = useState<FiltroTipo>("todos");
  const [reportes, cambiarReportes] = useState<ReportePublico[]>(REPORTES_EJEMPLO);
  const [cargando, cambiarCargando] = useState(true);
  const [sonEjemplo, cambiarSonEjemplo] = useState(true);

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const respuesta = await fetch("/api/reportes");
        const coleccion = await respuesta.json();
        if (!respuesta.ok || !Array.isArray(coleccion.features)) return;
        const reales = coleccion.features.map((feature: { properties: ReportePublico }) => feature.properties);
        if (reales.length > 0) {
          cambiarReportes(reales);
          cambiarSonEjemplo(false);
        }
      } catch {
        // Los datos de ejemplo mantienen útil la demo si Supabase está vacío o no responde.
      } finally {
        cambiarCargando(false);
      }
    };
    void cargarReportes();
  }, []);

  const reportesFiltrados = useMemo(() => {
    return reportes.filter((reporte) => {
      const abierto = esEstatusAbierto(reporte.estatus);
      const coincideEstatus =
        estatusSeleccionado === "todos" ||
        (estatusSeleccionado === "abiertos" ? abierto : !abierto);
      const coincideTipo =
        tipoSeleccionado === "todos" || reporte.tipo === tipoSeleccionado;
      return coincideEstatus && coincideTipo;
    });
  }, [estatusSeleccionado, tipoSeleccionado, reportes]);

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
          <nav className="flex items-center gap-3">
            <a href="/seguir" className="text-sm font-semibold underline">
              Seguir un reporte
            </a>
            <a
              href="/reportar"
              className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-sky-950"
            >
              Reportar
            </a>
          </nav>
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
          {cargando ? "Cargando…" : sonEjemplo ? `${reportesFiltrados.length} reportes · datos de ejemplo` : `${reportesFiltrados.length} reportes`}
        </p>
      </section>

      <PieDeslinde />
    </main>
  );
}
