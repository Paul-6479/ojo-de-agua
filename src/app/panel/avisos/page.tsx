import Link from "next/link";
import { redirect } from "next/navigation";
import FormularioAviso from "@/components/panel/FormularioAviso";
import ListaAvisosPanel from "@/components/panel/ListaAvisosPanel";
import { listarAvisosPanel } from "@/lib/consultas";
import { obtenerUsuarioSesion, puedeEntrarAlPanel } from "@/lib/sesion";

export default async function AvisosPanel() {
  const usuario = await obtenerUsuarioSesion();
  if (!puedeEntrarAlPanel(usuario)) redirect("/panel/entrar");

  const avisos = await listarAvisosPanel().catch(() => []);
  const puedePublicar = usuario!.rol !== "moderador";

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-sky-950">Avisos de corte y tandeo</h1>
        <Link href="/panel" className="text-sm font-semibold text-sky-800 underline">← Bandeja</Link>
      </div>

      <p className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
        Esta es la función que más le sirve a COMAPA: cada aviso publicado aquí le ahorra llamadas al
        conmutador. Se ve en la portada, en el mapa (el municipio afectado se pinta) y en{" "}
        <Link href="/avisos" className="underline">la página de avisos</Link>.
      </p>

      {puedePublicar ? (
        <FormularioAviso />
      ) : (
        <p className="rounded-2xl bg-amber-100 p-4 text-sm font-semibold text-amber-950">
          Tu rol puede consultar los avisos pero no publicarlos.
        </p>
      )}

      <ListaAvisosPanel avisos={avisos} puedeRetirar={puedePublicar} />
    </main>
  );
}
