import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PieDeslinde from "@/components/PieDeslinde";
import BotonYoTambien from "@/components/reporte/BotonYoTambien";
import Bitacora from "@/components/reporte/Bitacora";
import MapaMini from "@/components/reporte/MapaMiniDiferido";
import { obtenerFichaPorFolio } from "@/lib/consultas";
import { CATALOGO_ESTATUS, CATALOGO_TIPOS, ETIQUETA_ORIGEN, type EstatusReporte } from "@/lib/tipos";

// La ficha siempre lee la base: un vecino que acaba de confirmar debe ver su conteo.
export const dynamic = "force-dynamic";

const FORMATO_FOLIO = /^OJO-\d{4}-\d{4}$/;
const ESTATUS_SIN_ATENCION: EstatusReporte[] = ["recibido", "validado", "en_cola", "reabierto"];
const ESTATUS_CERRADO: EstatusReporte[] = ["resuelto", "cerrado"];

function normalizarFolio(folio: string) {
  return decodeURIComponent(folio).trim().toUpperCase();
}

function diasDesde(fecha: string) {
  const milisegundos = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(milisegundos / (1000 * 60 * 60 * 24)));
}

function textoDias(dias: number) {
  return dias === 1 ? "1 día" : `${dias} días`;
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export async function generateMetadata({ params }: PageProps<"/reporte/[folio]">): Promise<Metadata> {
  const { folio } = await params;
  return { title: `${normalizarFolio(folio)} · Ojo de Agua` };
}

export default async function FichaReporte({ params }: PageProps<"/reporte/[folio]">) {
  const { folio: folioCrudo } = await params;
  const folio = normalizarFolio(folioCrudo);
  if (!FORMATO_FOLIO.test(folio)) notFound();

  const ficha = await obtenerFichaPorFolio(folio);
  if (!ficha) notFound();

  const { reporte, eventos, fotos, confirmacionesResuelto } = ficha;
  const tipo = CATALOGO_TIPOS[reporte.tipo];
  const estatus = CATALOGO_ESTATUS[reporte.estatus];

  return (
    <main className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
          <Link href="/seguir" className="text-sm font-semibold underline">Buscar otro folio</Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-5">
        {reporte.es_ejemplo && (
          <p className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950">
            Reporte de ejemplo para la demostración
          </p>
        )}

        <section className="space-y-2">
          <h1 className="text-3xl font-black tracking-wide text-sky-950">{reporte.folio}</h1>
          <p className="text-xl font-bold">{tipo.emoji} {tipo.etiqueta}</p>
          <span
            className="inline-block rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: estatus.color }}
          >
            {estatus.etiqueta}
          </span>
          <p className="text-sm text-slate-600">Estatus {ETIQUETA_ORIGEN[reporte.origen_estatus]}</p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          {ESTATUS_SIN_ATENCION.includes(reporte.estatus) && (
            <p className="text-lg font-bold text-rose-800">
              Reportado hace {textoDias(diasDesde(reporte.creado_en))} · sin atención confirmada
            </p>
          )}
          {ESTATUS_CERRADO.includes(reporte.estatus) && (
            <p className="text-lg font-bold text-emerald-800">
              Cerrado hace {textoDias(diasDesde(reporte.cerrado_en ?? reporte.creado_en))}
            </p>
          )}
          {!ESTATUS_SIN_ATENCION.includes(reporte.estatus) && !ESTATUS_CERRADO.includes(reporte.estatus) && (
            <p className="text-lg font-bold text-sky-900">
              Reportado hace {textoDias(diasDesde(reporte.creado_en))}
            </p>
          )}
          {reporte.fecha_estimada_comapa && (
            <p className="mt-1 text-sm text-slate-700">
              Fecha comprometida por COMAPA: {new Date(reporte.fecha_estimada_comapa).toLocaleDateString("es-MX")}
            </p>
          )}
        </section>

        <section className="space-y-1 text-base">
          {reporte.referencia && <p><span className="font-semibold">Referencia:</span> {reporte.referencia}</p>}
          <p>
            <span className="font-semibold">Zona:</span>{" "}
            {[reporte.colonia, reporte.municipio ? capitalizar(reporte.municipio) : null].filter(Boolean).join(", ") || "Sin especificar"}
          </p>
          <p><span className="font-semibold">Severidad:</span> {capitalizar(reporte.severidad)}</p>
          {reporte.descripcion && <p className="pt-2 text-slate-800">{reporte.descripcion}</p>}
        </section>

        <section className="space-y-2">
          {/* La ubicación pública viene redondeada a ~25 m desde la vista reporte_publico. */}
          <MapaMini latitud={reporte.latitud} longitud={reporte.longitud} color={estatus.color} />
          <Link href="/" className="block text-center text-sm font-semibold text-sky-800 underline">
            Ver en el mapa grande
          </Link>
        </section>

        {fotos.length > 0 && (
          <section className="flex gap-3 overflow-x-auto pb-2">
            {fotos.map((foto) => (
              // eslint-disable-next-line @next/next/no-img-element -- ya viene comprimida desde el teléfono
              <img
                key={foto.id}
                src={foto.url}
                alt={`Foto del reporte ${reporte.folio}`}
                className="h-40 w-auto flex-none rounded-xl object-cover"
              />
            ))}
          </section>
        )}

        <BotonYoTambien
          reporteId={reporte.id}
          confirmacionesIniciales={reporte.confirmaciones}
          estatus={reporte.estatus}
        />
        {confirmacionesResuelto >= 2 && (
          <p className="rounded-xl bg-emerald-100 px-4 py-3 font-semibold text-emerald-900">
            La comunidad indica que ya fue reparado ({confirmacionesResuelto} personas)
          </p>
        )}

        <Bitacora eventos={eventos} />
      </article>

      <PieDeslinde />
    </main>
  );
}
