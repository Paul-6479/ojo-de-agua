export type TipoProblema = "fuga_calle" | "fuga_domicilio" | "sin_agua" | "baja_presion" | "agua_sucia" | "drenaje" | "alcantarilla" | "hidrante" | "otro";
export type Severidad = "baja" | "media" | "alta";
export type EstatusReporte = "recibido" | "validado" | "en_cola" | "en_proceso" | "resuelto" | "cerrado" | "duplicado" | "rechazado" | "reabierto" | "derivado";
export type OrigenEstatus = "ciudadano" | "comunidad" | "moderador" | "comapa" | "sistema";
export type Municipio = "tampico" | "madero" | "altamira";

export interface ReportePublico {
  id: string;
  folio: string;
  tipo: TipoProblema;
  severidad: Severidad;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  referencia: string | null;
  colonia: string | null;
  municipio: Municipio | null;
  estatus: EstatusReporte;
  origen_estatus: OrigenEstatus;
  fecha_estimada_comapa: string | null;
  estimacion_estadistica: string | null;
  dias_sin_atencion: number | null;
  reporte_padre_id: string | null;
  es_ejemplo: boolean;
  creado_en: string;
  cerrado_en: string | null;
  confirmaciones: number;
}

export interface ReporteGeoJSON {
  type: "Feature";
  properties: ReportePublico;
  geometry: { type: "Point"; coordinates: [number, number] };
}

export const CATALOGO_TIPOS: Record<TipoProblema, { etiqueta: string; emoji: string }> = {
  fuga_calle: { etiqueta: "Fuga en la calle", emoji: "💧" },
  fuga_domicilio: { etiqueta: "Fuga en domicilio", emoji: "🚰" },
  sin_agua: { etiqueta: "Sin agua", emoji: "🚱" },
  baja_presion: { etiqueta: "Baja presión", emoji: "〰️" },
  agua_sucia: { etiqueta: "Agua sucia", emoji: "🟤" },
  drenaje: { etiqueta: "Drenaje", emoji: "🕳️" },
  alcantarilla: { etiqueta: "Alcantarilla", emoji: "⚠️" },
  hidrante: { etiqueta: "Hidrante", emoji: "🚒" },
  otro: { etiqueta: "Otro problema", emoji: "💬" },
};

export const CATALOGO_ESTATUS: Record<EstatusReporte, { etiqueta: string; color: string }> = {
  recibido: { etiqueta: "Recibido", color: "#e11d48" }, validado: { etiqueta: "Validado", color: "#f97316" },
  en_cola: { etiqueta: "En cola", color: "#f59e0b" }, en_proceso: { etiqueta: "En proceso", color: "#2563eb" },
  resuelto: { etiqueta: "Resuelto", color: "#16a34a" }, cerrado: { etiqueta: "Cerrado", color: "#64748b" },
  duplicado: { etiqueta: "Duplicado", color: "#94a3b8" }, rechazado: { etiqueta: "Rechazado", color: "#94a3b8" },
  reabierto: { etiqueta: "Reabierto", color: "#be123c" }, derivado: { etiqueta: "Derivado", color: "#94a3b8" },
};

export const ETIQUETA_ORIGEN: Record<OrigenEstatus, string> = {
  ciudadano: "según quien reportó", comunidad: "según vecinos", moderador: "según moderación", comapa: "según COMAPA", sistema: "actualizado por el sistema",
};
