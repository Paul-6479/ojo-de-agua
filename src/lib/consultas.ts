import { cache } from "react";
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
    supabase
      .from("confirmacion")
      .select("identificador")
      .eq("reporte_id", reporte.id)
      .eq("tipo", "resuelto"),
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
    confirmacionesResuelto: new Set(
      (resultadoConfirmaciones.data ?? []).map((confirmacion) => confirmacion.identificador),
    ).size,
  };
});
