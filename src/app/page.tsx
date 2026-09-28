import Link from "next/link";
import BannerAvisos from "@/components/inicio/BannerAvisos";
import MapaPortada from "@/components/inicio/MapaPortada";
import MetricasImpacto from "@/components/inicio/MetricasImpacto";
import RankingColonias from "@/components/inicio/RankingColonias";
import PieDeslinde from "@/components/PieDeslinde";
import { obtenerAvisosVigentes, obtenerEstadisticas } from "@/lib/consultas";

// Las cifras se recalculan cada 5 minutos: son tendencias, no un marcador en vivo.
export const revalidate = 300;

export default async function Inicio() {
  const [{ datos, sonEjemplo }, avisos] = await Promise.all([
    obtenerEstadisticas(),
    obtenerAvisosVigentes(),
  ]);
  // Un municipio se pinta en el mapa si algún aviso vigente lo menciona.
  const municipiosConAviso = [...new Set(avisos.flatMap((aviso) => aviso.municipios))];

  return (
    <main id="contenido" className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="z-10 bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">💧 Ojo de Agua</h1>
            <p className="text-xs text-sky-100">
              Reporte ciudadano del agua · Zona conurbada de Tampico
            </p>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/seguir" className="text-sm font-semibold underline">
              Seguir un reporte
            </Link>
            <Link href="/reportar" className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-sky-950">
              Reportar
            </Link>
          </nav>
        </div>
      </header>

      <BannerAvisos avisos={avisos} />

      <section className="bg-sky-900 px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl space-y-3">
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">
            El agua que se va por una fuga que nadie repara
          </h2>
          <p className="max-w-2xl text-sky-100">
            Cualquier vecino de Tampico, Ciudad Madero o Altamira puede reportar una fuga, una falta de
            agua o un drenaje roto en menos de un minuto, sin crear cuenta. Todos los reportes son
            públicos y nadie puede borrarlos.
          </p>
          <Link
            href="/reportar"
            className="inline-block min-h-12 rounded-xl bg-sky-400 px-6 py-3 text-lg font-black text-sky-950"
          >
            Reportar un problema
          </Link>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5">
        {sonEjemplo && (
          <p className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950">
            Las cifras de abajo salen de reportes de ejemplo cargados para la demostración.
          </p>
        )}
        <MetricasImpacto datos={datos} />
      </div>

      <MapaPortada municipiosConAviso={municipiosConAviso} />

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6">
        <RankingColonias datos={datos} />
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-sky-950">¿Por qué importa este mapa?</h2>
          <p className="mt-2 text-slate-800">
            Un reporte suelto se pierde en una llamada telefónica. Cien reportes en un mapa público, con
            fecha y con vecinos confirmando, son un hecho difícil de ignorar. Ojo de Agua no repara
            fugas: hace visible cuántas hay, dónde y desde cuándo.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Este sitio es un proyecto ciudadano independiente. Cuando COMAPA participe, sus respuestas
            aparecerán aquí etiquetadas como oficiales; mientras no lo haga, el sitio dice honestamente
            que nadie ha confirmado atención.
          </p>
        </section>
      </div>

      <PieDeslinde />
    </main>
  );
}
