import { equivalenciaPipas, litrosLegibles, type EstadisticasPublicas } from "@/lib/estadisticas";

function Tarjeta({
  cifra,
  etiqueta,
  detalle,
  tono,
}: {
  cifra: string;
  etiqueta: string;
  detalle?: string;
  tono: "alarma" | "neutro" | "bien";
}) {
  const colores = {
    alarma: "text-rose-800",
    neutro: "text-sky-900",
    bien: "text-emerald-800",
  }[tono];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className={`text-3xl font-black leading-tight sm:text-4xl ${colores}`}>{cifra}</p>
      <p className="mt-1 font-bold text-slate-800">{etiqueta}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

export default function MetricasImpacto({ datos }: { datos: EstadisticasPublicas }) {
  const pipas = equivalenciaPipas(datos.litros_perdidos);

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          cifra={litrosLegibles(datos.litros_perdidos)}
          etiqueta="se estarían perdiendo ahora mismo"
          detalle={pipas > 0 ? `Equivale a unas ${pipas.toLocaleString("es-MX")} pipas de 10 000 litros` : undefined}
          tono="alarma"
        />
        <Tarjeta
          cifra={String(datos.sin_atender_mas_de_7_dias)}
          etiqueta="reportes llevan más de una semana sin atención confirmada"
          detalle={`De ${datos.abiertos} reportes abiertos en total`}
          tono="alarma"
        />
        <Tarjeta
          cifra={datos.dias_promedio_abierto !== null ? `${datos.dias_promedio_abierto} días` : "—"}
          etiqueta="lleva abierto un reporte en promedio"
          detalle={
            datos.dias_mediana_cierre !== null && datos.muestra_cierres > 0
              ? `Los que se resolvieron tardaron ${datos.dias_mediana_cierre} días (mediana de ${datos.muestra_cierres} casos)`
              : "Todavía no hay suficientes casos resueltos para estimar cuánto tardan"
          }
          tono="neutro"
        />
        <Tarjeta
          cifra={datos.confirmaciones.toLocaleString("es-MX")}
          etiqueta="veces que un vecino confirmó «a mí también me afecta»"
          detalle={`${datos.total} reportes ciudadanos en total · ${datos.cerrados} marcados como resueltos`}
          tono="bien"
        />
      </div>

      {/* El supuesto va visible al lado de la cifra, no escondido en una nota al pie:
          es la regla de §7.3 de CLAUDE.md. */}
      <p className="rounded-xl bg-sky-100 px-4 py-3 text-xs leading-relaxed text-sky-950">
        <strong>Cómo se calculan estas cifras.</strong> Los litros perdidos son una{" "}
        <strong>estimación ciudadana</strong>, no una medición: se suma, por cada reporte abierto, una
        tasa supuesta de litros por hora según el tipo y la gravedad del problema (por ejemplo 1 000
        litros/hora para una fuga media en la calle), multiplicada por el tiempo que lleva sin
        resolverse. No incluye los reportes ya cerrados. Los días de resolución salen de lo que
        reporta la propia comunidad; <strong>no son tiempos oficiales de COMAPA</strong>.
      </p>
    </section>
  );
}
