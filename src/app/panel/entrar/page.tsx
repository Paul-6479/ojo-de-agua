import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormularioEntrar from "@/components/panel/FormularioEntrar";
import { obtenerUsuarioSesion, puedeEntrarAlPanel } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrar al panel · Ojo de Agua" };

export default async function Entrar() {
  const usuario = await obtenerUsuarioSesion();
  if (puedeEntrarAlPanel(usuario)) redirect("/panel");

  return (
    <main className="flex min-h-dvh flex-col bg-sky-950 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-2">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
          <h1 className="text-3xl font-black">Panel de atención</h1>
          <p className="text-sky-200">
            Acceso para personal de COMAPA y moderación. Si vienes a reportar una fuga,{" "}
            <Link href="/reportar" className="font-bold underline">entra por aquí</Link>.
          </p>
        </div>

        <FormularioEntrar />

        {usuario && !puedeEntrarAlPanel(usuario) && (
          <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
            Tu cuenta ({usuario.correo}) no tiene permisos de panel. Pide a un administrador que te
            asigne el rol.
          </p>
        )}

        <p className="text-xs text-sky-300">
          Este panel es una demostración de la fase B. Los cambios que se hacen aquí se publican en el
          mapa etiquetados como «según COMAPA».
        </p>
      </div>
    </main>
  );
}
