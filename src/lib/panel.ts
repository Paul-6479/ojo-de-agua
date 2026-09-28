import { crearClienteServidor } from "@/lib/supabase";
import type { EstatusReporte, Municipio, OrigenEstatus, Severidad, TipoProblema } from "@/lib/tipos";

// Fila de la vista bandeja_operador. Solo la lee código de servidor: incluye la
// ubicación exacta, que nunca sale al navegador del público.
export type FilaBandeja = {
  id: string;
  folio: string;
  tipo: TipoProblema;
  severidad: Severidad;
  estatus: EstatusReporte;
  origen_estatus: OrigenEstatus;
  colonia: string | null;
  municipio: Municipio | null;
  referencia: string | null;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  fecha_estimada_comapa: string | null;
  creado_en: string;
  cerrado_en: string | null;
  es_ejemplo: boolean;
  visible: boolean;
  dias_abierto: number;
  confirmaciones: number;
  fotos: number;
  fotos_por_aprobar: number;
};

export type FiltrosBandeja = {
  estatus?: string;
  municipio?: string;
  tipo?: string;
};

const ESTATUS_ABIERTOS: EstatusReporte[] = ["recibido", "validado", "en_cola", "en_proceso", "reabierto"];

export async function listarBandeja(filtros: FiltrosBandeja) {
  const supabase = crearClienteServidor();
  let consulta = supabase.from("bandeja_operador").select("*").eq("visible", true);

  if (filtros.estatus && filtros.estatus !== "abiertos") {
    consulta = consulta.eq("estatus", filtros.estatus);
  } else {
    // Por omisión la bandeja muestra solo lo que falta atender.
    consulta = consulta.in("estatus", ESTATUS_ABIERTOS);
  }
  if (filtros.municipio) consulta = consulta.eq("municipio", filtros.municipio);
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);

  // Primero lo más viejo y más confirmado: es la prioridad real de la calle.
  const { data, error } = await consulta
    .order("confirmaciones", { ascending: false })
    .order("creado_en", { ascending: true })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as FilaBandeja[];
}

export type FotoOperador = {
  id: string;
  ruta_storage: string;
  momento: string | null;
  aprobada: boolean;
  creado_en: string;
  url: string;
};

export type EventoOperador = {
  id: number;
  tipo_evento: string;
  estatus_anterior: string | null;
  estatus_nuevo: string | null;
  nota: string | null;
  origen: OrigenEstatus;
  rol: string | null;
  creado_en: string;
};

export async function obtenerReportePanel(folio: string) {
  const supabase = crearClienteServidor();
  const { data: reporte, error } = await supabase
    .from("bandeja_operador")
    .select("*")
    .eq("folio", folio)
    .maybeSingle();
  if (error) throw error;
  if (!reporte) return null;

  const fila = reporte as FilaBandeja;
  const [resultadoFotos, resultadoEventos] = await Promise.all([
    supabase
      .from("foto")
      .select("id, ruta_storage, momento, aprobada, creado_en")
      .eq("reporte_id", fila.id)
      .order("creado_en", { ascending: true }),
    supabase
      .from("evento_reporte")
      .select("id, tipo_evento, estatus_anterior, estatus_nuevo, nota, origen, rol, creado_en")
      .eq("reporte_id", fila.id)
      .order("creado_en", { ascending: false }),
  ]);
  if (resultadoFotos.error) throw resultadoFotos.error;
  if (resultadoEventos.error) throw resultadoEventos.error;

  const fotos = (resultadoFotos.data ?? []).map((foto) => ({
    ...foto,
    url: supabase.storage.from("fotos-reportes").getPublicUrl(foto.ruta_storage).data.publicUrl,
  })) as FotoOperador[];

  return { reporte: fila, fotos, eventos: (resultadoEventos.data ?? []) as EventoOperador[] };
}

export async function contarBandeja() {
  const supabase = crearClienteServidor();
  const { count: abiertos } = await supabase
    .from("bandeja_operador")
    .select("id", { count: "exact", head: true })
    .eq("visible", true)
    .in("estatus", ESTATUS_ABIERTOS);
  const { count: porAprobar } = await supabase
    .from("foto")
    .select("id", { count: "exact", head: true })
    .eq("aprobada", false);
  return { abiertos: abiertos ?? 0, fotosPorAprobar: porAprobar ?? 0 };
}
