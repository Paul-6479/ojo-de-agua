import Link from "next/link";

export const metadata = { title: "Sin conexión · Ojo de Agua" };

export default function SinConexion() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-sky-50 px-4 text-center text-slate-950">
      <p className="text-5xl">💧</p>
      <h1 className="text-2xl font-black text-sky-950">No hay internet</h1>
      <p className="max-w-sm text-slate-700">
        Puedes seguir llenando un reporte: se guarda en tu teléfono y se envía solo en cuanto vuelva la
        señal.
      </p>
      <Link href="/reportar" className="min-h-12 rounded-xl bg-sky-800 px-6 py-3 text-lg font-bold text-white">
        Reportar un problema
      </Link>
    </main>
  );
}
