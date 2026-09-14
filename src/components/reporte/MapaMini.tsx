"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Mapa chico y fijo (sin arrastre ni zoom) para ubicar un solo reporte.
// Se importa en diferido desde la ficha para que el texto aparezca antes que el mapa.
export default function MapaMini({ latitud, longitud, color }: { latitud: number; longitud: number; color: string }) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contenedor.current) return;

    const claveMapTiler = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const estilo = claveMapTiler
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${claveMapTiler}`
      : "https://demotiles.maplibre.org/style.json";

    // Ver scripts/copiar-worker-maplibre.mjs: sin esto el mapa queda en blanco.
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const mapa = new maplibregl.Map({
      container: contenedor.current,
      style: estilo,
      center: [longitud, latitud],
      zoom: 15.5,
      interactive: false,
      attributionControl: { compact: true },
    });
    new maplibregl.Marker({ color }).setLngLat([longitud, latitud]).addTo(mapa);

    return () => mapa.remove();
  }, [latitud, longitud, color]);

  return <div ref={contenedor} className="h-52 w-full rounded-2xl border border-sky-200 bg-sky-100" />;
}
