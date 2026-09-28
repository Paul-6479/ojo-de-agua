"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { comprimirFoto } from "@/lib/foto";
import type { FotoOperador } from "@/lib/panel";

export default function FotosOperador({
  reporteId,
  fotos,
}: {
  reporteId: string;
  fotos: FotoOperador[];
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [error, cambiarError] = useState("");
  const [trabajando, cambiarTrabajando] = useState(false);

  const subirEvidencia = async (archivo: File) => {
    cambiarTrabajando(true);
    cambiarError("");
    try {
      // Se recomprime en el navegador: baja el peso y descarta el EXIF (§7.4).
      const comprimida = await comprimirFoto(archivo);
      const cuerpo = new FormData();
      cuerpo.append("reporteId", reporteId);
      cuerpo.append("archivo", comprimida, "evidencia.jpg");
      const respuesta = await fetch("/api/panel/foto", { method: "POST", body: cuerpo });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo subir la foto.");
        return;
      }
      router.refresh();
    } catch {
      cambiarError("No se pudo subir la foto.");
    } finally {
      cambiarTrabajando(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  const moderar = async (fotoId: string, aprobada: boolean) => {
    cambiarTrabajando(true);
    cambiarError("");
    try {
      const respuesta = await fetch("/api/panel/foto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId, aprobada }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo guardar el cambio.");
        return;
      }
      router.refresh();
    } catch {
      cambiarError("No se pudo guardar el cambio.");
    } finally {
      cambiarTrabajando(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold text-sky-950">Fotos y evidencia</h2>
      <p className="text-sm text-slate-600">
        Oculta cualquier foto donde se vea gente identificable, placas o el interior de una casa.
      </p>

      {fotos.length === 0 ? (
        <p className="text-sm text-slate-500">Este reporte no tiene fotos.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {fotos.map((foto) => (
            <li key={foto.id} className="space-y-2 rounded-xl border border-slate-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- ya viene comprimida */}
              <img src={foto.url} alt="Foto del reporte" className="h-40 w-full rounded-lg object-cover" />
              <p className="text-xs font-semibold text-slate-600">
                {foto.momento === "despues" ? "Evidencia del después" : "Foto ciudadana"} ·{" "}
                {foto.aprobada ? "visible al público" : "oculta"}
              </p>
              <button
                type="button"
                disabled={trabajando}
                onClick={() => void moderar(foto.id, !foto.aprobada)}
                className="min-h-10 w-full rounded-lg bg-slate-800 px-3 text-sm font-bold text-white disabled:bg-slate-400"
              >
                {foto.aprobada ? "Ocultar del público" : "Aprobar y publicar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1 border-t border-slate-200 pt-3">
        <label htmlFor="evidencia" className="block text-sm font-bold">
          Subir foto del trabajo terminado
        </label>
        <p className="text-xs text-slate-600">Hace falta al menos una para poder cerrar el reporte.</p>
        <input
          id="evidencia"
          ref={entrada}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={trabajando}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            if (archivo) void subirEvidencia(archivo);
          }}
          className="block w-full text-sm"
        />
      </div>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
    </section>
  );
}
