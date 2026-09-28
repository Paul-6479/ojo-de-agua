import type { Municipio, TipoProblema } from "@/lib/tipos";

export type EstadisticasPublicas = {
  total: number;
  abiertos: number;
  cerrados: number;
  reabiertos: number;
  sin_atender_mas_de_7_dias: number;
  dias_promedio_abierto: number | null;
  dias_mediana_cierre: number | null;
  muestra_cierres: number;
  litros_perdidos: number;
  confirmaciones: number;
  por_tipo: { tipo: TipoProblema; total: number }[];
  por_municipio: { municipio: Municipio | "sin_municipio"; total: number; abiertos: number }[];
  ranking_colonias: { colonia: string; total: number; abiertos: number; dias_del_mas_viejo: number }[];
  solo_ejemplos: boolean;
  calculado_en: string;
};

// Cifras de respaldo para que la portada nunca se vea vacía en la demostración
// si la base está dormida. Se marcan como ejemplo en la interfaz.
export const ESTADISTICAS_EJEMPLO: EstadisticasPublicas = {
  total: 16,
  abiertos: 11,
  cerrados: 4,
  reabiertos: 1,
  sin_atender_mas_de_7_dias: 6,
  dias_promedio_abierto: 12.4,
  dias_mediana_cierre: 9,
  muestra_cierres: 4,
  litros_perdidos: 1_482_000,
  confirmaciones: 27,
  por_tipo: [
    { tipo: "fuga_calle", total: 6 },
    { tipo: "sin_agua", total: 4 },
    { tipo: "baja_presion", total: 3 },
    { tipo: "drenaje", total: 2 },
    { tipo: "agua_sucia", total: 1 },
  ],
  por_municipio: [
    { municipio: "tampico", total: 7, abiertos: 5 },
    { municipio: "madero", total: 5, abiertos: 4 },
    { municipio: "altamira", total: 4, abiertos: 2 },
  ],
  ranking_colonias: [
    { colonia: "Ampliación Unidad Nacional", total: 3, abiertos: 3, dias_del_mas_viejo: 31 },
    { colonia: "Árbol Grande", total: 3, abiertos: 2, dias_del_mas_viejo: 24 },
    { colonia: "Smith", total: 2, abiertos: 2, dias_del_mas_viejo: 18 },
    { colonia: "Tancol", total: 2, abiertos: 1, dias_del_mas_viejo: 12 },
    { colonia: "Miramar", total: 2, abiertos: 1, dias_del_mas_viejo: 9 },
  ],
  solo_ejemplos: true,
  calculado_en: new Date(0).toISOString(),
};

// Un número grande de litros no se lee: 1482000 no dice nada, "1.5 millones" sí.
export function litrosLegibles(litros: number) {
  if (litros >= 1_000_000) return `${(litros / 1_000_000).toFixed(1)} millones de litros`;
  if (litros >= 1_000) return `${Math.round(litros / 1_000).toLocaleString("es-MX")} mil litros`;
  return `${Math.round(litros).toLocaleString("es-MX")} litros`;
}

// Equivalencia para que la cifra se entienda: una pipa de agua son ~10 000 L.
export function equivalenciaPipas(litros: number) {
  return Math.round(litros / 10_000);
}
