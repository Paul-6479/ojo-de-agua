"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PasoUbicacion from "@/components/reportar/PasoUbicacion";
import PasoProblema from "@/components/reportar/PasoProblema";
import PasoEnviar, { type FotoPreparada } from "@/components/reportar/PasoEnviar";
import Confirmacion from "@/components/reportar/Confirmacion";
import { obtenerTokenDispositivo } from "@/lib/dispositivo";
import type { Severidad, TipoProblema } from "@/lib/tipos";

type Borrador = { latitud: number; longitud: number; precision_gps_m: number | null; pin_movido: boolean; tipo: TipoProblema | null; severidad: Severidad; descripcion: string; referencia: string; colonia: string; sitio_web: string; };
const CENTRO = { latitud: 22.2553, longitud: -97.8686 };

export default function Reportar() {
  const [paso, cambiarPaso] = useState(1);
  const [borrador, cambiarBorrador] = useState<Borrador>({ ...CENTRO, precision_gps_m: null, pin_movido: false, tipo: null, severidad: "media", descripcion: "", referencia: "", colonia: "", sitio_web: "" });
  const [avisoUbicacion, cambiarAvisoUbicacion] = useState<string | null>(null);
  const [fotos, cambiarFotos] = useState<FotoPreparada[]>([]);
  const [enviando, cambiarEnviando] = useState(false);
  const [error, cambiarError] = useState("");
  const [confirmacion, cambiarConfirmacion] = useState<{ folio: string; publicado: boolean; mensaje?: string } | null>(null);
  const actualizar = (cambios: Partial<Borrador>) => cambiarBorrador((actual) => ({ ...actual, ...cambios }));

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((posicion) => actualizar({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude, precision_gps_m: posicion.coords.accuracy }), () => cambiarAvisoUbicacion("No pudimos ubicarte; arrastra el pin al lugar del problema."), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  }, []);

  const enviar = async () => {
    if (!borrador.tipo) return;
    cambiarEnviando(true); cambiarError("");
    try {
      const respuesta = await fetch("/api/reportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...borrador, token: obtenerTokenDispositivo() }) });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.ok) { cambiarError(resultado.error ?? "No se pudo enviar el reporte."); return; }
      let fotoFallo = false;
      for (const foto of fotos) {
        const formulario = new FormData(); formulario.append("archivo", foto.archivo, "foto.jpg"); formulario.append("token", obtenerTokenDispositivo());
        const subida = await fetch(`/api/reportes/${resultado.id}/foto`, { method: "POST", body: formulario });
        if (!subida.ok) fotoFallo = true;
      }
      cambiarConfirmacion({ folio: resultado.folio, publicado: resultado.publicado, mensaje: fotoFallo ? "El reporte se guardó, pero una foto no se pudo subir." : resultado.mensaje });
    } catch { cambiarError("No se pudo enviar el reporte. Revisa tu conexión e intenta de nuevo."); }
    finally { cambiarEnviando(false); }
  };

  return <main className="min-h-dvh bg-sky-50 px-4 py-5 text-slate-950"><div className="mx-auto max-w-lg"><Link href="/" className="text-sm font-bold text-sky-800">← Volver al mapa</Link><header className="mt-3 border-b-2 border-sky-900 pb-3"><h1 className="text-2xl font-black">Reportar un problema</h1><p className="mt-2 text-sm font-bold text-sky-900">1 Ubicación · 2 Problema · 3 Enviar</p></header>
    <div className="py-5">{confirmacion ? <Confirmacion {...confirmacion} /> : <>{paso === 1 && <PasoUbicacion latitud={borrador.latitud} longitud={borrador.longitud} precision={borrador.precision_gps_m} aviso={avisoUbicacion} alMoverPin={(latitud, longitud) => actualizar({ latitud, longitud, pin_movido: true })} alContinuar={() => cambiarPaso(2)} />}{paso === 2 && <PasoProblema borrador={borrador} latitud={borrador.latitud} longitud={borrador.longitud} alCambiar={actualizar} alContinuar={() => cambiarPaso(3)} />}{paso === 3 && borrador.tipo && <PasoEnviar tipo={borrador.tipo} severidad={borrador.severidad} descripcion={borrador.descripcion} referencia={borrador.referencia} colonia={borrador.colonia} fotos={fotos} alCambiarFotos={cambiarFotos} alEnviar={() => void enviar()} enviando={enviando} />}{error && <p className="mt-4 rounded-lg bg-rose-100 p-3 font-medium text-rose-950">{error}</p>}</>}</div>
    <footer className="border-t border-slate-300 pt-3 text-center text-xs text-slate-600">Proyecto ciudadano independiente. No es un canal oficial de COMAPA.</footer></div></main>;
}
