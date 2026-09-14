import type { ReporteGeoJSON, ReportePublico } from "@/lib/tipos";

function fechaHace(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString();
}

type DatoEjemplo = Omit<ReportePublico, "id" | "folio" | "es_ejemplo" | "creado_en" | "confirmaciones" | "fecha_estimada_comapa" | "estimacion_estadistica" | "dias_sin_atencion" | "reporte_padre_id" | "cerrado_en"> & { dias: number };

const datos: DatoEjemplo[] = [
  { tipo: "fuga_calle", severidad: "alta", descripcion: "Se está haciendo un charco grande desde temprano.", latitud: 22.2167, longitud: -97.8585, referencia: "Frente a la plaza", colonia: "Centro", municipio: "tampico", estatus: "recibido", origen_estatus: "ciudadano", dias: 2 },
  { tipo: "sin_agua", severidad: "media", descripcion: "Desde anoche no sale ni una gota.", latitud: 22.2382, longitud: -97.8738, referencia: "Cerca del mercado", colonia: "Guadalupe", municipio: "tampico", estatus: "validado", origen_estatus: "moderador", dias: 5 },
  { tipo: "baja_presion", severidad: "media", descripcion: "En el segundo piso ya no sube el agua.", latitud: 22.2498, longitud: -97.8774, referencia: "Sobre avenida Hidalgo", colonia: "Petrolera", municipio: "tampico", estatus: "en_cola", origen_estatus: "comunidad", dias: 9 },
  { tipo: "drenaje", severidad: "alta", descripcion: "La alcantarilla se regresa cuando llueve.", latitud: 22.2648, longitud: -97.8842, referencia: "Esquina con calle Fresno", colonia: "Del Bosque", municipio: "tampico", estatus: "en_proceso", origen_estatus: "comapa", dias: 12 },
  { tipo: "fuga_domicilio", severidad: "baja", descripcion: "Fuga constante en la toma de la banqueta.", latitud: 22.2718, longitud: -97.8681, referencia: "A media cuadra del parque", colonia: "Lomas de Rosales", municipio: "tampico", estatus: "resuelto", origen_estatus: "comunidad", dias: 16 },
  { tipo: "agua_sucia", severidad: "media", descripcion: "El agua salió amarillenta esta mañana.", latitud: 22.2456, longitud: -97.8539, referencia: "Por la iglesia", colonia: "Águila", municipio: "tampico", estatus: "recibido", origen_estatus: "ciudadano", dias: 3 },
  { tipo: "alcantarilla", severidad: "alta", descripcion: "La tapa está rota y es peligroso de noche.", latitud: 22.2294, longitud: -97.8506, referencia: "Frente a la primaria", colonia: "Arenal", municipio: "tampico", estatus: "reabierto", origen_estatus: "comunidad", dias: 23 },
  { tipo: "fuga_calle", severidad: "media", descripcion: "Corre agua limpia por toda la calle.", latitud: 22.2078, longitud: -97.8696, referencia: "Junto a la cancha", colonia: "Morelos", municipio: "tampico", estatus: "cerrado", origen_estatus: "comunidad", dias: 31 },
  { tipo: "fuga_calle", severidad: "alta", descripcion: "Sale agua con fuerza del pavimento.", latitud: 22.2463, longitud: -97.8354, referencia: "Cerca de la presidencia", colonia: "Centro", municipio: "madero", estatus: "recibido", origen_estatus: "ciudadano", dias: 1 },
  { tipo: "sin_agua", severidad: "alta", descripcion: "Toda la cuadra amaneció sin servicio.", latitud: 22.2664, longitud: -97.8433, referencia: "Entre Guerrero y Durango", colonia: "Unidad Nacional", municipio: "madero", estatus: "validado", origen_estatus: "moderador", dias: 7 },
  { tipo: "baja_presion", severidad: "media", descripcion: "Solo hay agua de madrugada y con poca fuerza.", latitud: 22.2805, longitud: -97.8288, referencia: "Cerca de la avenida principal", colonia: "Miramar", municipio: "madero", estatus: "en_cola", origen_estatus: "comunidad", dias: 14 },
  { tipo: "drenaje", severidad: "alta", descripcion: "Hay olor fuerte y el registro está lleno.", latitud: 22.2588, longitud: -97.8229, referencia: "Una cuadra antes del mercado", colonia: "Árbol Grande", municipio: "madero", estatus: "en_proceso", origen_estatus: "comapa", dias: 20 },
  { tipo: "hidrante", severidad: "baja", descripcion: "El hidrante gotea todo el día.", latitud: 22.2397, longitud: -97.8169, referencia: "A un lado de la unidad deportiva", colonia: "Primero de Mayo", municipio: "madero", estatus: "resuelto", origen_estatus: "comunidad", dias: 35 },
  { tipo: "agua_sucia", severidad: "media", descripcion: "Agua con tierra después del corte de ayer.", latitud: 22.3946, longitud: -97.9382, referencia: "Por la plaza", colonia: "Centro", municipio: "altamira", estatus: "recibido", origen_estatus: "ciudadano", dias: 4 },
  { tipo: "sin_agua", severidad: "alta", descripcion: "Ya van dos días sin agua en las casas.", latitud: 22.4157, longitud: -97.9101, referencia: "Cerca de la carretera", colonia: "Miramar sector norte", municipio: "altamira", estatus: "derivado", origen_estatus: "moderador", dias: 28 },
  { tipo: "fuga_calle", severidad: "media", descripcion: "Fuga pequeña, pero no deja de correr.", latitud: 22.3674, longitud: -97.9188, referencia: "Frente a la tienda", colonia: "Laguna de la Puerta", municipio: "altamira", estatus: "rechazado", origen_estatus: "moderador", dias: 45 },
];

export const REPORTES_EJEMPLO: ReportePublico[] = datos.map((reporte, indice) => ({
  ...reporte,
  id: `ejemplo-${indice + 1}`,
  folio: `OJO-2026-${String(indice + 1).padStart(4, "0")}`,
  es_ejemplo: true,
  creado_en: fechaHace(reporte.dias),
  confirmaciones: indice % 4,
  fecha_estimada_comapa: null,
  estimacion_estadistica: null,
  dias_sin_atencion: null,
  reporte_padre_id: null,
  cerrado_en: reporte.estatus === "cerrado" ? fechaHace(reporte.dias - 2) : null,
}));

export function reportesAGeoJSON(reportes: ReportePublico[]): GeoJSON.FeatureCollection {
  const features: ReporteGeoJSON[] = reportes.map((reporte) => ({
    type: "Feature",
    properties: reporte,
    geometry: { type: "Point", coordinates: [reporte.longitud, reporte.latitud] },
  }));

  return { type: "FeatureCollection", features };
}
