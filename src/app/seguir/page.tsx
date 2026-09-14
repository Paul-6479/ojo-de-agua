"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PieDeslinde from "@/components/PieDeslinde";
import { useFoliosRecientes } from "@/lib/dispositivo";

// Acepta "OJO-2026-0142", "ojo 2026 0142" o solo "142" (se completa con el año actual).
function normalizarFolio(texto: string) {
  const limpio = texto.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
  if (/^\d{1,4}$/.test(limpio)) {
    return `OJO-${new Date().getFullYear()}-${limpio.padStart(4, "0")}`;
  }
  const partes = limpio.match(/^(?:OJO-?)?(\d{4})-?(\d{1,4})$/);
  if (partes) return `OJO-${partes[1]}-${partes[2].padStart(4, "0")}`;
  return null;
}

export default function Seguir() {
  const router = useRouter();
  const [texto, cambiarTexto] = useState("");
  const [error, cambiarError] = useState("");
  const recientes = useFoliosRecientes();

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    const folio = normalizarFolio(texto);
    if (!folio) {
      cambiarError("Escribe un folio como OJO-2026-0142 o solo el número.");
      return;
    }
    router.push(`/reporte/${folio}`);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
          <Link href="/reportar" className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-sky-950">Reportar</Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-6">
        <form onSubmit={buscar} className="space-y-3">
          <label htmlFor="folio" className="block text-xl font-bold text-sky-950">Seguir un reporte</label>
          <input
            id="folio"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="OJO-2026-0001"
            value={texto}
            onChange={(evento) => { cambiarTexto(evento.target.value); cambiarError(""); }}
            className="min-h-14 w-full rounded-xl border-2 border-sky-900 bg-white px-4 text-2xl font-bold tracking-wide"
          />
          {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
          <button type="submit" className="min-h-12 w-full rounded-xl bg-sky-800 px-5 py-3 text-lg font-bold text-white">
            Buscar
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="font-bold text-sky-950">Tus reportes recientes en este teléfono</h2>
          {recientes.length === 0 ? (
            <p className="text-sm text-slate-600">Aquí aparecerán los folios de los reportes que hagas desde este teléfono.</p>
          ) : (
            <ul className="space-y-2">
              {recientes.map((folio) => (
                <li key={folio}>
                  <Link href={`/reporte/${folio}`} className="block rounded-xl bg-white px-4 py-3 text-lg font-bold text-sky-900 shadow-sm">
                    {folio}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <PieDeslinde />
    </main>
  );
}
