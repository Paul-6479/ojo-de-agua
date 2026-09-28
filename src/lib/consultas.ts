import { cache } from "react";
import type { AvisoPublico } from "@/lib/avisos";
import { ESTADISTICAS_EJEMPLO, type EstadisticasPublicas } from "@/lib/estadisticas";
import { crearClienteServidor } from "@/lib/supabase";
import type { OrigenEstatus, ReportePublico } from "@/lib/tipos";

export type EventoPublico = {
  tipo_evento: string;
  estatus_anterior: string | null;
  estatus_nuevo: string | null;
  nota: string | null;
  origen: OrigenEstatus;
  creado_en: string;
};

export type FotoPublica = {
  id: string;
  ruta_storage: string;
  ruta_miniatura: string | null;
  creado_en: string;
  url: string;
};

export type FichaReporte = {
  reporte: ReportePublico;
  eventos: EventoPublico[];
  fotos: FotoPublica[];
  confirmacionesResuelto: number;
};

export const obtenerFichaPorFolio = cache(async (folio: string): Promise<FichaReporte | null> => {
  const supabase = crearClienteServidor();
  const { data: reporte, error: errorReporte } = await supabase
    .from("reporte_publico")
    .select("*")
    .eq("folio", folio)
    .maybeSingle();

  if (errorReporte) throw errorReporte;
  if (!reporte) return null;

  const [resultadoEventos, resultadoFotos, resultadoConfirmaciones] = await Promise.all([
    supabase
      .from("evento_reporte")
      .select("tipo_evento, estatus_anterior, estatus_nuevo, nota, origen, creado_en")
      .eq("reporte_id", reporte.id)
      .order("creado_en", { ascending: true }),
    supabase
      .from("foto")
      .select("id, ruta_storage, ruta_miniatura, creado_en")
      .eq("reporte_id", reporte.id)
      .eq("aprobada", true)
      .order("creado_en", { ascending: true }),
    // Los "ya la arreglaron" de los duplicados fusionados cuentan para el padre,
    // igual que las confirmaciones de tipo afectado de la vista (§7.2).
    supabase.rpc("confirmaciones_resuelto", { p_reporte_id: reporte.id }),
  ]);

  if (resultadoEventos.error) throw resultadoEventos.error;
  if (resultadoFotos.error) throw resultadoFotos.error;
  if (resultadoConfirmaciones.error) throw resultadoConfirmaciones.error;

  const fotos = (resultadoFotos.data ?? []).map((foto) => {
    const { data } = supabase.storage.from("fotos-reportes").getPublicUrl(foto.ruta_storage);
    return { ...foto, url: data.publicUrl };
  });

  return {
    reporte: reporte as ReportePublico,
    eventos: (resultadoEventos.data ?? []) as EventoPublico[],
    fotos,
    confirmacionesResuelto: (resultadoConfirmaciones.data as number | null) ?? 0,
  };
});

// --- Cifras de la portada (semana 5) ---

// Si la base no responde o solo tiene reportes de ejemplo, la portada usa cifras
// de respaldo y lo dice. Un mapa vacío no convence a nadie (§7.6).
export const obtenerEstadisticas = cache(async (): Promise<{
  datos: EstadisticasPublicas;
  sonEjemplo: boolean;
}> => {
  try {
    const supabase = crearClienteServidor();
    const { data, error } = await supabase.rpc("estadisticas_publicas");
    if (error) throw error;

    const datos = data as EstadisticasPublicas | null;
    if (!datos || datos.total === 0) return { datos: ESTADISTICAS_EJEMPLO, sonEjemplo: true };
    return { datos, sonEjemplo: datos.solo_ejemplos };
  } catch (error) {
    console.error("No se pudieron leer las estadísticas; se usan las de ejemplo:", error);
    return { datos: ESTADISTICAS_EJEMPLO, sonEjemplo: true };
  }
});

// --- Avisos de cortes y tandeo (semana 6) ---

export const obtenerAvisosVigentes = cache(async (): Promise<AvisoPublico[]> => {
  try {
    const supabase = crearClienteServidor();
    const { data, error } = await supabase.rpc("avisos_vigentes");
    if (error) throw error;
    return (data ?? []) as AvisoPublico[];
  } catch (error) {
    console.error("No se pudieron leer los avisos:", error);
    return [];
  }
});

// El panel ve también los retirados y los que aún no empiezan.
export async function listarAvisosPanel() {
  const supabase = crearClienteServidor();
  const { data, error } = await supabase
    .from("aviso")
    .select("id, titulo, cuerpo, tipo, municipios, colonias, vigente_desde, vigente_hasta, fuente, publicado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as (AvisoPublico & { publicado: boolean })[];
}
