"use client";

import { useRouter } from "next/navigation";

export default function BotonSalir() {
  const router = useRouter();

  const salir = async () => {
    await fetch("/api/panel/sesion", { method: "DELETE" });
    router.push("/panel/entrar");
    router.refresh();
  };

  return (
    <button type="button" onClick={() => void salir()} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold">
      Salir
    </button>
  );
}
