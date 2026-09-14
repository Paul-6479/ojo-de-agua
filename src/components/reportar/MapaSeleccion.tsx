"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapaSeleccionProps = {
  latitud: number;
  longitud: number;
  alMoverPin: (latitud: number, longitud: number) => void;
};

export default function MapaSeleccion({ latitud, longitud, alMoverPin }: MapaSeleccionProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcador = useRef<maplibregl.Marker | null>(null);
  const posicionInicial = useRef<[number, number]>([longitud, latitud]);
  const alMoverRef = useRef(alMoverPin);

  useEffect(() => { alMoverRef.current = alMoverPin; }, [alMoverPin]);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const clave = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const nuevoMapa = new maplibregl.Map({
      container: contenedor.current,
      style: clave ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${clave}` : "https://demotiles.maplibre.org/style.json",
      center: posicionInicial.current,
      zoom: 16,
    });
    const nuevoMarcador = new maplibregl.Marker({ draggable: true }).setLngLat(posicionInicial.current).addTo(nuevoMapa);
    nuevoMarcador.on("dragend", () => {
      const posicion = nuevoMarcador.getLngLat();
      alMoverRef.current(posicion.lat, posicion.lng);
    });
    mapa.current = nuevoMapa;
    marcador.current = nuevoMarcador;
    return () => { nuevoMapa.remove(); mapa.current = null; marcador.current = null; };
  }, []);

  useEffect(() => {
    const posicion: [number, number] = [longitud, latitud];
    marcador.current?.setLngLat(posicion);
    mapa.current?.easeTo({ center: posicion });
  }, [latitud, longitud]);

  return <div ref={contenedor} className="h-72 w-full overflow-hidden rounded-xl border-2 border-sky-900" />;
}
