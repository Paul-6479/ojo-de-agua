"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CATALOGO_AVISOS, NOMBRE_MUNICIPIO_AVISO, type TipoAviso } from "@/lib/avisos";

const TIPOS = Object.keys(CATALOGO_AVISOS) as TipoAviso[];
const MUNICIPIOS = Object.keys(NOMBRE_MUNICIPIO_AVISO);

export default function FormularioAviso() {
  const router = useRouter();
  const [tipo, cambiarTipo] = useState<TipoAviso>("corte");
  const [titulo, cambiarTitulo] = useState("");
  const [cuerpo, cambiarCuerpo] = useState("");
  const [municipios, cambiarMunicipios] = useState<string[]>([]);
  const [colonias, cambiarColonias] = useState("");
  const [desde, cambiarDesde] = useState("");
  const [hasta, cambiarHasta] = useState("");
  const [fuente, cambiarFuente] = useState("");
  const [error, cambiarError] = useState("");
  const [mensaje, cambiarMensaje] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  const alternarMunicipio = (clave: string) => {
    cambiarMunicipios((actuales) =>
      actuales.includes(clave) ? actuales.filter((valor) => valor !== clave) : [...actuales, clave],
    );
  };

  const publicar = async (evento: FormEvent) => {
    evento.preventDefault();
    cambiarEnviando(true);
    cambiarError("");
    cambiarMensaje("");
    try {
      const respuesta = await fetch("/api/panel/aviso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          titulo,
          cuerpo,
          municipios,
          // Las colonias se escriben separadas por comas; el servidor las recorta.
          colonias: colonias.split(",").map((valor) => valor.trim()).filter(Boolean),
          vigenteDesde: desde || null,
          vigenteHasta: hasta || null,
          fuente,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        cambiarError(datos.error ?? "No se pudo publicar el aviso.");
        return;
      }
      cambiarTitulo("");
      cambiarCuerpo("");
      cambiarColonias("");
      cambiarMunicipios([]);
      cambiarMensaje("Aviso publicado. Ya se ve en la portada.");
      router.refresh();
    } catch {
      cambiarError("No se pudo publicar el aviso. Revisa tu conexión.");
    } finally {
      cambiarEnviando(false);
    }
  };

  return (
    <form onSubmit={publicar} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold text-sky-950">Publicar un aviso</h2>

      <div className="flex flex-wrap gap-2">
        {TIPOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => cambiarTipo(opcion)}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
              tipo === opcion ? "text-white" : "bg-slate-100 text-slate-800"
            }`}
            style={tipo === opcion ? { backgroundColor: CATALOGO_AVISOS[opcion].color } : undefined}
          >
            {CATALOGO_AVISOS[opcion].emoji} {CATALOGO_AVISOS[opcion].etiqueta}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="titulo" className="block text-sm font-bold">Título</label>
        <input
          id="titulo"
          required
          maxLength={140}
          value={titulo}
          onChange={(evento) => cambiarTitulo(evento.target.value)}
          placeholder="Ej.: Corte programado por reparación de línea de 24 pulgadas"
          className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="cuerpo" className="block text-sm font-bold">Explicación</label>
        <textarea
          id="cuerpo"
          required
          rows={3}
          maxLength={1000}
          value={cuerpo}
          onChange={(evento) => cambiarCuerpo(evento.target.value)}
          placeholder="Qué va a pasar, a qué hora regresa el servicio y qué se recomienda hacer."
          className="w-full rounded-xl border-2 border-slate-300 p-3"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Municipios afectados</legend>
        <div className="flex flex-wrap gap-2">
          {MUNICIPIOS.map((clave) => (
            <button
              key={clave}
              type="button"
              onClick={() => alternarMunicipio(clave)}
              className={`min-h-11 rounded-xl px-4 font-bold ${
                municipios.includes(clave) ? "bg-sky-800 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {NOMBRE_MUNICIPIO_AVISO[clave]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="colonias" className="block text-sm font-bold">
          Colonias <span className="font-normal text-slate-500">(opcional, separadas por comas)</span>
        </label>
        <input
          id="colonias"
          value={colonias}
          onChange={(evento) => cambiarColonias(evento.target.value)}
          placeholder="Árbol Grande, Smith, Tancol"
          className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="desde" className="block text-sm font-bold">Empieza</label>
          <input
            id="desde"
            type="datetime-local"
            value={desde}
            onChange={(evento) => cambiarDesde(evento.target.value)}
            className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="hasta" className="block text-sm font-bold">Termina</label>
          <input
            id="hasta"
            type="datetime-local"
            value={hasta}
            onChange={(evento) => cambiarHasta(evento.target.value)}
            className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="fuente" className="block text-sm font-bold">Fuente</label>
        <input
          id="fuente"
          maxLength={140}
          value={fuente}
          onChange={(evento) => cambiarFuente(evento.target.value)}
          placeholder="Ej.: Boletín COMAPA del 3 de octubre"
          className="min-h-12 w-full rounded-xl border-2 border-slate-300 px-3"
        />
        {/* Decir de dónde viene el aviso protege legalmente al proyecto (§1). */}
        <p className="text-xs text-slate-500">
          Si lo dejas vacío, el aviso se publica como «Ojo de Agua (demostración)». Nunca atribuyas a
          COMAPA un aviso que COMAPA no publicó.
        </p>
      </div>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      {mensaje && <p className="text-sm font-semibold text-emerald-700">{mensaje}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 w-full rounded-xl bg-sky-800 px-4 font-bold text-white disabled:bg-slate-400"
      >
        {enviando ? "Publicando…" : "Publicar aviso"}
      </button>
    </form>
  );
}
