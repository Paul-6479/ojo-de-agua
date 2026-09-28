"use client";

import { useEffect, useMemo, useState } from "react";
import Filtros, {
  esEstatusAbierto,
  type FiltroEstatus,
  type FiltroTipo,
} from "@/components/Filtros";
import Mapa from "@/components/Mapa";
import { REPORTES_EJEMPLO } from "@/lib/datosEjemplo";
import type { ReportePublico } from "@/lib/tipos";

export default function MapaPortada({ municipiosConAviso = [] }: { municipiosConAviso?: string[] }) {
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
    <>
      <Filtros
        estatusSeleccionado={estatusSeleccionado}
        tipoSeleccionado={tipoSeleccionado}
        alCambiarEstatus={cambiarEstatus}
        alCambiarTipo={cambiarTipo}
      />

      <section className="relative min-h-[70vh] flex-1">
        <Mapa reportes={reportesFiltrados} municipiosConAviso={municipiosConAviso} />
        <p className="absolute left-3 top-3 rounded-full bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow">
          {cargando
            ? "Cargando…"
            : sonEjemplo
              ? `${reportesFiltrados.length} reportes · datos de ejemplo`
              : `${reportesFiltrados.length} reportes`}
        </p>
      </section>
    </>
  );
}
