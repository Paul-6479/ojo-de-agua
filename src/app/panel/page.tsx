import Link from "next/link";
import { redirect } from "next/navigation";
import { contarBandeja, listarBandeja } from "@/lib/panel";
import { obtenerUsuarioSesion, puedeEntrarAlPanel } from "@/lib/sesion";
import { CATALOGO_ESTATUS, CATALOGO_TIPOS, type EstatusReporte } from "@/lib/tipos";

const OPCIONES_ESTATUS: { valor: string; etiqueta: string }[] = [
  { valor: "abiertos", etiqueta: "Todos los abiertos" },
  { valor: "recibido", etiqueta: "Recibidos" },
  { valor: "validado", etiqueta: "Validados" },
  { valor: "en_cola", etiqueta: "En cola" },
  { valor: "en_proceso", etiqueta: "En proceso" },
  { valor: "reabierto", etiqueta: "Reabiertos" },
  { valor: "resuelto", etiqueta: "Resueltos" },
  { valor: "cerrado", etiqueta: "Cerrados" },
];

const MUNICIPIOS = [
  { valor: "", etiqueta: "Los tres municipios" },
  { valor: "tampico", etiqueta: "Tampico" },
  { valor: "madero", etiqueta: "Cd. Madero" },
  { valor: "altamira", etiqueta: "Altamira" },
];

export default async function Bandeja({ searchParams }: PageProps<"/panel">) {
  const usuario = await obtenerUsuarioSesion();
  if (!puedeEntrarAlPanel(usuario)) redirect("/panel/entrar");

  const parametros = await searchParams;
  const estatus = typeof parametros.estatus === "string" ? parametros.estatus : "abiertos";
  const municipio = typeof parametros.municipio === "string" ? parametros.municipio : "";

  const [filas, conteos] = await Promise.all([
    listarBandeja({ estatus, municipio: municipio || undefined }),
    contarBandeja(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-3xl font-black text-sky-900">{conteos.abiertos}</p>
          <p className="text-sm font-semibold text-slate-600">reportes sin cerrar</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-3xl font-black text-amber-700">{conteos.fotosPorAprobar}</p>
          <p className="text-sm font-semibold text-slate-600">fotos por revisar</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-3xl font-black text-slate-900">{filas.length}</p>
          <p className="text-sm font-semibold text-slate-600">en esta vista</p>
        </div>
      </section>

      {/* Filtros con enlaces y no con JavaScript: funcionan sin sesión de cliente. */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="estatus" className="block text-sm font-bold">Estatus</label>
          <select id="estatus" name="estatus" defaultValue={estatus} className="min-h-11 rounded-xl border-2 border-slate-300 px-3">
            {OPCIONES_ESTATUS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="municipio" className="block text-sm font-bold">Municipio</label>
          <select id="municipio" name="municipio" defaultValue={municipio} className="min-h-11 rounded-xl border-2 border-slate-300 px-3">
            {MUNICIPIOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 font-bold text-white">Filtrar</button>
      </form>

      {filas.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
          No hay reportes con esos filtros.
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((fila) => {
            const tipo = CATALOGO_TIPOS[fila.tipo];
            const color = CATALOGO_ESTATUS[fila.estatus as EstatusReporte];
            return (
              <li key={fila.id}>
                <Link
                  href={`/panel/reporte/${fila.folio}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm hover:bg-sky-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sky-950">{fila.folio}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: color.color }}
                    >
                      {color.etiqueta}
                    </span>
                    {fila.es_ejemplo && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">ejemplo</span>
                    )}
                    {fila.fotos_por_aprobar > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                        {fila.fotos_por_aprobar} foto(s) por revisar
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-bold">{tipo.emoji} {tipo.etiqueta}</p>
                  <p className="text-sm text-slate-600">
                    {[fila.colonia, fila.municipio].filter(Boolean).join(", ") || "Sin zona"}
                    {fila.referencia ? ` · ${fila.referencia}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {fila.dias_abierto} días · {fila.confirmaciones} vecinos afectados
                    {fila.fecha_estimada_comapa
                      ? ` · comprometido para ${new Date(fila.fecha_estimada_comapa).toLocaleDateString("es-MX")}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
