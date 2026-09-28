"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATALOGO_AVISOS, vigenciaLegible, zonaLegible, type AvisoPublico } from "@/lib/avisos";

export default function ListaAvisosPanel({
  avisos,
  puedeRetirar,
}: {
  avisos: (AvisoPublico & { publicado: boolean })[];
  puedeRetirar: boolean;
}) {
  const router = useRouter();
  const [trabajando, cambiarTrabajando] = useState(false);

  const alternar = async (avisoId: string, publicado: boolean) => {
    cambiarTrabajando(true);
    try {
      await fetch("/api/panel/aviso", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisoId, publicado }),
      });
      router.refresh();
    } finally {
      cambiarTrabajando(false);
    }
  };

  if (avisos.length === 0) {
    return <p className="rounded-2xl bg-white p-4 text-slate-600 shadow-sm">Todavía no hay avisos.</p>;
  }

  return (
    <section className="space-y-3">
      <h2 className="font-bold text-sky-950">Avisos publicados</h2>
      <ul className="space-y-2">
        {avisos.map((aviso) => {
          const info = CATALOGO_AVISOS[aviso.tipo] ?? CATALOGO_AVISOS.informativo;
          return (
            <li key={aviso.id} className="space-y-1 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: info.color }}
                >
                  {info.etiqueta}
                </span>
                {!aviso.publicado && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                    retirado
                  </span>
                )}
              </div>
              <p className="font-bold">{aviso.titulo}</p>
              <p className="text-sm text-slate-700">{zonaLegible(aviso)} · {vigenciaLegible(aviso)}</p>
              {puedeRetirar && (
                <button
                  type="button"
                  disabled={trabajando}
                  onClick={() => void alternar(aviso.id, !aviso.publicado)}
                  className="min-h-10 rounded-lg bg-slate-800 px-3 text-sm font-bold text-white disabled:bg-slate-400"
                >
                  {aviso.publicado ? "Retirar de la portada" : "Volver a publicar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
