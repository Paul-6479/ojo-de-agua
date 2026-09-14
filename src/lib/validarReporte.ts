import { CATALOGO_TIPOS, type Severidad, type TipoProblema } from "@/lib/tipos";

export interface DatosReporteValido {
  tipo: TipoProblema;
  severidad: Severidad;
  latitud: number;
  longitud: number;
  descripcion: string | null;
  referencia: string | null;
  colonia: string | null;
  precision_gps_m: number | null;
  pin_movido: boolean;
  token: string;
  sitio_web: string;
}

type ResultadoValidacion = { ok: true; datos: DatosReporteValido } | { ok: false; error: string };
type ErrorValidacion = { ok: false; error: string };

function textoOpcional(valor: unknown, limite: number, nombre: string): string | null | ErrorValidacion {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return { ok: false, error: `${nombre} no es válido.` };
  const texto = valor.trim();
  if (texto.length > limite) return { ok: false, error: `${nombre} debe tener máximo ${limite} caracteres.` };
  return texto || null;
}

export function validarReporte(entrada: unknown): ResultadoValidacion {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { ok: false, error: "Los datos del reporte no son válidos." };
  }

  const datos = entrada as Record<string, unknown>;
  // Campo trampa: los humanos no lo ven, así que solo un bot lo llena.
  if (typeof datos.sitio_web === "string" && datos.sitio_web.trim() !== "") {
    return { ok: false, error: "Honeypot activado" };
  }
  if (typeof datos.tipo !== "string" || !(datos.tipo in CATALOGO_TIPOS)) {
    return { ok: false, error: "Elige un tipo de problema válido." };
  }
  if (datos.severidad !== undefined && datos.severidad !== "baja" && datos.severidad !== "media" && datos.severidad !== "alta") {
    return { ok: false, error: "Elige una severidad válida." };
  }
  if (typeof datos.latitud !== "number" || !Number.isFinite(datos.latitud) || typeof datos.longitud !== "number" || !Number.isFinite(datos.longitud)) {
    return { ok: false, error: "Necesitamos una ubicación válida para el reporte." };
  }
  if (typeof datos.token !== "string" || !datos.token.trim()) {
    return { ok: false, error: "No se pudo identificar este dispositivo." };
  }
  if (datos.precision_gps_m !== undefined && datos.precision_gps_m !== null && (typeof datos.precision_gps_m !== "number" || !Number.isFinite(datos.precision_gps_m))) {
    return { ok: false, error: "La precisión del GPS no es válida." };
  }

  const descripcion = textoOpcional(datos.descripcion, 500, "La descripción");
  const referencia = textoOpcional(datos.referencia, 120, "La referencia");
  const colonia = textoOpcional(datos.colonia, 120, "La colonia");
  if (descripcion !== null && typeof descripcion === "object") return descripcion;
  if (referencia !== null && typeof referencia === "object") return referencia;
  if (colonia !== null && typeof colonia === "object") return colonia;

  return {
    ok: true,
    datos: {
      tipo: datos.tipo as TipoProblema,
      severidad: (datos.severidad ?? "media") as Severidad,
      latitud: datos.latitud,
      longitud: datos.longitud,
      descripcion,
      referencia,
      colonia,
      precision_gps_m: (datos.precision_gps_m as number | null | undefined) ?? null,
      pin_movido: datos.pin_movido === true,
      token: datos.token.trim(),
      sitio_web: "",
    },
  };
}
