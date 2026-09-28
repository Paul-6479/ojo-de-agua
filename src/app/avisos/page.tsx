import type { Metadata } from "next";
import Link from "next/link";
import PieDeslinde from "@/components/PieDeslinde";
import { CATALOGO_AVISOS, vigenciaLegible, zonaLegible } from "@/lib/avisos";
import { obtenerAvisosVigentes } from "@/lib/consultas";

export const metadata: Metadata = { title: "Avisos de agua · Ojo de Agua" };
export const revalidate = 120;

export default async function Avisos() {
  const avisos = await obtenerAvisosVigentes();

  return (
    <main id="contenido" className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
          <Link href="/reportar" className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-sky-950">
            Reportar
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-sky-950">Cortes, tandeo y avisos vigentes</h1>
          <p className="text-sm text-slate-700">
            Aquí aparecen los cortes programados y los horarios de tandeo que se han publicado. Cada
            aviso dice de dónde viene: si no lo publicó COMAPA, lo dice.
          </p>
        </div>

        {avisos.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
            No hay avisos vigentes en este momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {avisos.map((aviso) => {
              const info = CATALOGO_AVISOS[aviso.tipo] ?? CATALOGO_AVISOS.informativo;
              return (
                <li key={aviso.id} className="space-y-1 rounded-2xl bg-white p-4 shadow-sm">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.emoji} {info.etiqueta}
                  </span>
                  <h2 className="text-lg font-bold text-sky-950">{aviso.titulo}</h2>
                  <p className="text-slate-800">{aviso.cuerpo}</p>
                  <p className="text-sm font-semibold text-slate-700">{zonaLegible(aviso)}</p>
                  <p className="text-xs text-slate-500">
                    {vigenciaLegible(aviso)} · Fuente: {aviso.fuente}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PieDeslinde />
    </main>
  );
}
