"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { reportesAGeoJSON } from "@/lib/datosEjemplo";
import {
  CATALOGO_ESTATUS,
  CATALOGO_TIPOS,
  ETIQUETA_ORIGEN,
  type ReportePublico,
} from "@/lib/tipos";

type MapaProps = {
  reportes: ReportePublico[];
  alSeleccionar?: (reporte: ReportePublico) => void;
};

const FUENTE_REPORTES = "reportes";
const CAPA_CLUSTERS = "circulos-cluster";
const CAPA_NUMERO_CLUSTER = "numero-cluster";
const CAPA_PUNTOS = "puntos-individuales";

// Centro de la conurbación y límites holgados para que nadie se pierda arrastrando el mapa.
const CENTRO_CONURBACION: [number, number] = [-97.8686, 22.2553];
const LIMITES_CONURBACION: [[number, number], [number, number]] = [
  [-98.03, 22.14],
  [-97.73, 22.49],
];

// Expresión de MapLibre: "según el valor de `estatus`, usa este color".
// Se construye a partir del catálogo para no repetir los colores aquí.
const paresEstatusColor = Object.entries(CATALOGO_ESTATUS).flatMap(
  ([estatus, detalle]) => [estatus, detalle.color],
);
const expresionColorEstatus = [
  "match",
  ["get", "estatus"],
  ...paresEstatusColor,
  "#64748b",
] as unknown as ExpressionSpecification;

function escaparHtml(texto: string) {
  const reemplazos: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  };
  return texto.replace(/[&<>'"]/g, (caracter) => reemplazos[caracter] ?? caracter);
}

function diasTranscurridos(fecha: string) {
  const milisegundosPorDia = 86_400_000;
  const diferencia = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diferencia / milisegundosPorDia));
}

function textoHace(dias: number) {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Hace 1 día";
  return `Hace ${dias} días`;
}

function nombreMunicipio(municipio: ReportePublico["municipio"]) {
  if (municipio === "tampico") return "Tampico";
  if (municipio === "madero") return "Ciudad Madero";
  if (municipio === "altamira") return "Altamira";
  return "Sin municipio";
}

function contenidoPopup(reporte: ReportePublico) {
  const tipo = CATALOGO_TIPOS[reporte.tipo];
  const estatus = CATALOGO_ESTATUS[reporte.estatus];
  const lugar = `${escaparHtml(reporte.colonia ?? "Sin colonia")}, ${nombreMunicipio(reporte.municipio)}`;

  return `
    <div style="font-family:Arial,sans-serif;min-width:190px">
      <strong>${escaparHtml(reporte.folio)}</strong>
      <p>${tipo.emoji} ${escaparHtml(tipo.etiqueta)}</p>
      <p>
        <span style="color:${estatus.color};font-weight:bold">● ${escaparHtml(estatus.etiqueta)}</span><br>
        <small>${ETIQUETA_ORIGEN[reporte.origen_estatus]}</small>
      </p>
      <p>${textoHace(diasTranscurridos(reporte.creado_en))} · ${lugar}</p>
      ${reporte.es_ejemplo ? "<small>Datos de ejemplo</small>" : ""}
    </div>
  `;
}

export default function Mapa({ reportes, alSeleccionar }: MapaProps) {
  const contenedorMapa = useRef<HTMLDivElement>(null);

  // useRef guarda valores que sobreviven entre renderizados sin provocar uno nuevo.
  // El mapa vive aquí porque MapLibre maneja su propio DOM, fuera del árbol de React.
  const mapa = useRef<maplibregl.Map | null>(null);
  // Siempre guarda la lista más reciente: si los reportes llegan de Supabase
  // antes de que el mapa termine de cargar, el mapa los toma de aquí al arrancar.
  const reportesRecientes = useRef(reportes);
  useEffect(() => {
    reportesRecientes.current = reportes;
  }, [reportes]);
  const alSeleccionarRef = useRef(alSeleccionar);

  // Se guarda la función más reciente en un ref para que el mapa no se
  // recree cada vez que el padre pase una función nueva.
  useEffect(() => {
    alSeleccionarRef.current = alSeleccionar;
  }, [alSeleccionar]);

  // Crear el mapa una sola vez, cuando el contenedor ya existe en la página.
  useEffect(() => {
    if (!contenedorMapa.current || mapa.current) return;

    const claveMapTiler = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const estilo = claveMapTiler
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${claveMapTiler}`
      : "https://demotiles.maplibre.org/style.json";

    // Ver scripts/copiar-worker-maplibre.mjs: sin esto el mapa queda en blanco.
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const nuevoMapa = new maplibregl.Map({
      container: contenedorMapa.current,
      style: estilo,
      center: CENTRO_CONURBACION,
      zoom: 12,
      maxBounds: LIMITES_CONURBACION,
    });
    mapa.current = nuevoMapa;

    nuevoMapa.addControl(new maplibregl.NavigationControl(), "top-right");
    nuevoMapa.addControl(new maplibregl.FullscreenControl(), "top-right");
    nuevoMapa.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    nuevoMapa.on("load", () => {
      nuevoMapa.addSource(FUENTE_REPORTES, {
        type: "geojson",
        data: reportesAGeoJSON(reportesRecientes.current),
        cluster: true,
        clusterRadius: 50,
      });

      // Círculos de los grupos: más grandes mientras más reportes agrupan.
      nuevoMapa.addLayer({
        id: CAPA_CLUSTERS,
        type: "circle",
        source: FUENTE_REPORTES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0369a1",
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 30, 29],
          "circle-opacity": 0.88,
        },
      });

      nuevoMapa.addLayer({
        id: CAPA_NUMERO_CLUSTER,
        type: "symbol",
        source: FUENTE_REPORTES,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Puntos individuales, coloreados por estatus.
      nuevoMapa.addLayer({
        id: CAPA_PUNTOS,
        type: "circle",
        source: FUENTE_REPORTES,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": expresionColorEstatus,
          "circle-radius": 9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Clic en un grupo: acercar hasta que se separe.
      nuevoMapa.on("click", CAPA_CLUSTERS, (evento) => {
        const grupo = nuevoMapa.queryRenderedFeatures(evento.point, {
          layers: [CAPA_CLUSTERS],
        })[0];
        const identificador = grupo?.properties?.cluster_id;
        if (typeof identificador !== "number") return;

        const fuente = nuevoMapa.getSource(FUENTE_REPORTES) as GeoJSONSource;
        void fuente.getClusterExpansionZoom(identificador).then((zoom) => {
          const coordenadas = (grupo.geometry as GeoJSON.Point).coordinates;
          nuevoMapa.easeTo({ center: coordenadas as [number, number], zoom });
        });
      });

      // Clic en un punto: abrir la ficha resumida.
      nuevoMapa.on("click", CAPA_PUNTOS, (evento) => {
        const elemento = evento.features?.[0] as MapGeoJSONFeature | undefined;
        if (!elemento?.properties) return;

        const reporte = elemento.properties as unknown as ReportePublico;
        const coordenadas = (elemento.geometry as GeoJSON.Point).coordinates;

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordenadas as [number, number])
          .setHTML(contenidoPopup(reporte))
          .addTo(nuevoMapa);

        alSeleccionarRef.current?.(reporte);
      });

      nuevoMapa.on("mouseenter", CAPA_PUNTOS, () => {
        nuevoMapa.getCanvas().style.cursor = "pointer";
      });
      nuevoMapa.on("mouseleave", CAPA_PUNTOS, () => {
        nuevoMapa.getCanvas().style.cursor = "";
      });
    });

    // Al desmontar el componente se destruye el mapa para no dejar memoria colgada.
    return () => {
      nuevoMapa.remove();
      mapa.current = null;
    };
  }, []);

  // Cuando cambian los reportes (por los filtros) solo se actualizan los datos,
  // sin recrear el mapa.
  useEffect(() => {
    const fuente = mapa.current?.getSource(FUENTE_REPORTES) as GeoJSONSource | undefined;
    if (!fuente) return;
    fuente.setData(reportesAGeoJSON(reportes));
    // Si el reporte del popup abierto ya no está en la lista, el popup quedaría huérfano.
    document.querySelectorAll(".maplibregl-popup-close-button").forEach((boton) => {
      (boton as HTMLButtonElement).click();
    });
  }, [reportes]);

  const faltaClaveMapTiler = !process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // `absolute inset-0` llena la sección padre (que debe ser `relative`) aunque
  // su alto venga de flex y no de un `height` fijo; `h-full` ahí mediría 0.
  return (
    <div className="absolute inset-0">
      <div ref={contenedorMapa} className="h-full w-full" />
      {faltaClaveMapTiler && (
        <p className="absolute bottom-3 left-3 rounded bg-white/90 px-3 py-2 text-xs text-slate-700 shadow">
          Falta la clave de MapTiler; se muestra el mapa de respaldo.
        </p>
      )}
    </div>
  );
}
