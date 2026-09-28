"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function FormularioEntrar() {
  const router = useRouter();
  const [correo, cambiarCorreo] = useState("");
  const [contrasena, cambiarContrasena] = useState("");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  const entrar = async (evento: FormEvent) => {
    evento.preventDefault();
    cambiarEnviando(true);
    cambiarError("");
    try {
      const respuesta = await fetch("/api/panel/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo entrar.");
        return;
      }
      router.push("/panel");
      router.refresh();
    } catch {
      cambiarError("No se pudo entrar. Revisa tu conexión.");
    } finally {
      cambiarEnviando(false);
    }
  };

  return (
    <form onSubmit={entrar} className="space-y-4 rounded-2xl bg-white p-5 text-slate-950 shadow-xl">
      <div className="space-y-1">
        <label htmlFor="correo" className="block font-bold">Correo</label>
        <input
          id="correo"
          type="email"
          required
          autoComplete="username"
          value={correo}
          onChange={(evento) => cambiarCorreo(evento.target.value)}
          className="min-h-12 w-full rounded-xl border-2 border-sky-900 px-3 text-lg"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="contrasena" className="block font-bold">Contraseña</label>
        <input
          id="contrasena"
          type="password"
          required
          autoComplete="current-password"
          value={contrasena}
          onChange={(evento) => cambiarContrasena(evento.target.value)}
          className="min-h-12 w-full rounded-xl border-2 border-sky-900 px-3 text-lg"
        />
      </div>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 w-full rounded-xl bg-sky-800 px-4 py-3 text-lg font-bold text-white disabled:bg-slate-400"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
