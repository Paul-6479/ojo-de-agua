import Link from "next/link";
import BotonSalir from "@/components/panel/BotonSalir";
import { obtenerUsuarioSesion, puedeEntrarAlPanel } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";

// El panel nunca se cachea: un operador debe ver el estado real de la calle.
export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const usuario = await obtenerUsuarioSesion();

  // La página de entrar es la única del panel sin sesión; se maneja aparte.
  if (!puedeEntrarAlPanel(usuario)) {
    // El layout envuelve también /panel/entrar, así que no se puede redirigir a
    // ciegas: se comprueba en cada página. Aquí solo se muestra el contenido.
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 text-slate-950">
      <header className="bg-slate-900 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/panel" className="text-lg font-bold">🛠️ Panel de atención</Link>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-amber-950">
              DEMOSTRACIÓN
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-300">
              {usuario!.correo} · {ETIQUETA_ROL[usuario!.rol]}
            </span>
            <Link href="/panel/avisos" className="underline">Avisos</Link>
            <Link href="/" className="underline">Ver mapa público</Link>
            <BotonSalir />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="bg-slate-900 px-4 py-3 text-center text-xs text-slate-400">
        Proyecto ciudadano independiente. No es un canal oficial de COMAPA. Los datos de este panel son
        de demostración.
      </footer>
    </div>
  );
}
