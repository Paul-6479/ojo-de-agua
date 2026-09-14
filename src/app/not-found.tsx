import Link from "next/link";
import PieDeslinde from "@/components/PieDeslinde";

// Página para folios que no existen y rutas equivocadas.
export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
        </div>
      </header>
      <section className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-black text-sky-950">No encontramos ese reporte</h1>
        <p className="text-slate-700">Revisa que el folio esté bien escrito, por ejemplo <strong>OJO-2026-0001</strong>.</p>
        <Link href="/seguir" className="block min-h-12 rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white">
          Buscar otro folio
        </Link>
        <Link href="/" className="block text-sm font-semibold text-sky-800 underline">Ir al mapa</Link>
      </section>
      <PieDeslinde />
    </main>
  );
}
