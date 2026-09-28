import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AccionesEstatus from "@/components/panel/AccionesEstatus";
import FechaEstimada from "@/components/panel/FechaEstimada";
import FotosOperador from "@/components/panel/FotosOperador";
import { obtenerReportePanel } from "@/lib/panel";
import { obtenerUsuarioSesion, puedeEntrarAlPanel } from "@/lib/sesion";
import { CATALOGO_ESTATUS, CATALOGO_TIPOS, ETIQUETA_ORIGEN } from "@/lib/tipos";

const FORMATO_FOLIO = /^OJO-\d{4}-\d{4}$/;

function fechaLegible(valor: string) {
  return new Date(valor).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default async function FichaOperador({ params }: PageProps<"/panel/reporte/[folio]">) {
  const usuario = await obtenerUsuarioSesion();
  if (!puedeEntrarAlPanel(usuario)) redirect("/panel/entrar");

  const { folio: folioCrudo } = await params;
  const folio = decodeURIComponent(folioCrudo).trim().toUpperCase();
  if (!FORMATO_FOLIO.test(folio)) notFound();

  const datos = await obtenerReportePanel(folio);
  if (!datos) notFound();

  const { reporte, fotos, eventos } = datos;
  const tipo = CATALOGO_TIPOS[reporte.tipo];
  const estatus = CATALOGO_ESTATUS[reporte.estatus];
  const evidencia = fotos.filter((foto) => foto.momento === "despues" && foto.aprobada);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5">
      <Link href="/panel" className="text-sm font-semibold text-sky-800 underline">← Volver a la bandeja</Link>

      <header className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-sky-950">{reporte.folio}</h1>
          <span
            className="rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: estatus.color }}
          >
            {estatus.etiqueta}
          </span>
          <span className="text-sm text-slate-600">{ETIQUETA_ORIGEN[reporte.origen_estatus]}</span>
        </div>
        <p className="text-lg font-bold">{tipo.emoji} {tipo.etiqueta} · severidad {reporte.severidad}</p>
        <p className="text-sm text-slate-700">
          {[reporte.colonia, reporte.municipio].filter(Boolean).join(", ") || "Sin zona"}
          {reporte.referencia ? ` · ${reporte.referencia}` : ""}
        </p>
        {reporte.descripcion && <p className="text-slate-800">{reporte.descripcion}</p>}
        <p className="text-sm font-semibold text-slate-700">
          Abierto {reporte.dias_abierto} días · {reporte.confirmaciones} vecinos afectados
        </p>
        {/* Aquí sí se muestra la ubicación exacta: es el panel interno, no el mapa público. */}
        <p className="text-xs text-slate-500">
          Ubicación exacta para cuadrilla: {reporte.latitud.toFixed(6)}, {reporte.longitud.toFixed(6)} ·{" "}
          <a
            href={`https://www.google.com/maps?q=${reporte.latitud},${reporte.longitud}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            abrir en mapas
          </a>
        </p>
        <Link href={`/reporte/${reporte.folio}`} className="inline-block text-sm font-semibold text-sky-800 underline">
          Ver la ficha pública
        </Link>
      </header>

      <AccionesEstatus
        reporteId={reporte.id}
        estatusActual={reporte.estatus}
        tieneEvidencia={evidencia.length > 0}
      />

      <FechaEstimada
        reporteId={reporte.id}
        fechaActual={reporte.fecha_estimada_comapa}
        puedeComprometer={usuario!.rol !== "moderador"}
      />

      <FotosOperador reporteId={reporte.id} fotos={fotos} />

      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-sky-950">Bitácora completa</h2>
        <ol className="space-y-2">
          {eventos.map((evento) => (
            <li key={evento.id} className="border-l-4 border-sky-200 pl-3 text-sm">
              <p className="font-semibold">
                {evento.tipo_evento.replace(/_/g, " ")}
                {evento.estatus_anterior && evento.estatus_nuevo
                  ? `: ${evento.estatus_anterior} → ${evento.estatus_nuevo}`
                  : ""}
              </p>
              {evento.nota && <p className="text-slate-700">{evento.nota}</p>}
              <p className="text-xs text-slate-500">
                {fechaLegible(evento.creado_en)} · {ETIQUETA_ORIGEN[evento.origen]}
                {evento.rol ? ` · ${evento.rol}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
