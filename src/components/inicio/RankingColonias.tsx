import { CATALOGO_TIPOS } from "@/lib/tipos";
import type { EstadisticasPublicas } from "@/lib/estadisticas";

const NOMBRE_MUNICIPIO: Record<string, string> = {
  tampico: "Tampico",
  madero: "Cd. Madero",
  altamira: "Altamira",
  sin_municipio: "Fuera de la zona",
};

export default function RankingColonias({ datos }: { datos: EstadisticasPublicas }) {
  const maximo = Math.max(1, ...datos.ranking_colonias.map((fila) => fila.total));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-sky-950">Colonias con más problemas reportados</h2>
        {datos.ranking_colonias.length === 0 ? (
          <p className="text-sm text-slate-600">
            Todavía nadie ha escrito su colonia al reportar.
          </p>
        ) : (
          <ol className="space-y-2">
            {datos.ranking_colonias.map((fila, indice) => (
              <li key={fila.colonia} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {indice + 1}. {fila.colonia}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {fila.total} {fila.total === 1 ? "reporte" : "reportes"}
                  </span>
                </div>
                {/* Barra simple con un div: no hace falta una librería de gráficas. */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-700"
                    style={{ width: `${Math.round((fila.total / maximo) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {fila.abiertos} sin resolver · el más viejo lleva {fila.dias_del_mas_viejo} días
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-slate-500">
          La colonia es el texto que escribe quien reporta, normalizado. Puede haber variantes de
          nombre para una misma colonia.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-sky-950">Por municipio</h2>
          <ul className="space-y-1">
            {datos.por_municipio.map((fila) => (
              <li key={fila.municipio} className="flex justify-between text-sm">
                <span className="font-semibold">{NOMBRE_MUNICIPIO[fila.municipio] ?? fila.municipio}</span>
                <span className="text-slate-700">
                  {fila.total} · <span className="font-bold text-rose-800">{fila.abiertos} abiertos</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-sky-950">Qué se reporta más</h2>
          <ul className="space-y-1">
            {datos.por_tipo.slice(0, 6).map((fila) => (
              <li key={fila.tipo} className="flex justify-between text-sm">
                <span className="font-semibold">
                  {CATALOGO_TIPOS[fila.tipo]?.emoji} {CATALOGO_TIPOS[fila.tipo]?.etiqueta ?? fila.tipo}
                </span>
                <span className="text-slate-700">{fila.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
