import { NextResponse } from "next/server";
import { hashSha256 } from "@/lib/hash";
import { revisarYRegistrarIntento } from "@/lib/limiteTasa";
import { crearClienteServidor } from "@/lib/supabase";

function respuestaError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function esUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

export async function POST(solicitud: Request, contexto: RouteContext<"/api/reportes/[id]/confirmar">) {
  const { id } = await contexto.params;
  if (!esUuid(id)) return respuestaError("El reporte no es válido.", 400);

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return respuestaError("Los datos enviados no son válidos.", 400);
  }

  if (!entrada || typeof entrada !== "object") return respuestaError("Los datos enviados no son válidos.", 400);
  const { token, tipo, comentario } = entrada as Record<string, unknown>;
  if (typeof token !== "string" || token.length < 10 || token.length > 100) {
    return respuestaError("No se pudo identificar este dispositivo.", 400);
  }
  if (tipo !== "afectado" && tipo !== "resuelto") return respuestaError("El tipo de confirmación no es válido.", 400);
  if (comentario !== undefined && typeof comentario !== "string") return respuestaError("El comentario no es válido.", 400);

  const supabase = crearClienteServidor();
  try {
    const { data: reporte, error: errorReporte } = await supabase
      .from("reporte")
      .select("id, estatus, visible")
      .eq("id", id)
      .maybeSingle();
    if (errorReporte) throw errorReporte;
    if (!reporte || !reporte.visible) return respuestaError("El reporte no existe.", 404);
    if (reporte.estatus === "rechazado" || reporte.estatus === "duplicado") {
      return respuestaError("Este reporte no admite confirmaciones.", 409);
    }

    const identificador = hashSha256(token);
    const permitido = await revisarYRegistrarIntento(supabase, solicitud, identificador);
    if (!permitido) return respuestaError("Espera unos minutos antes de enviar otra confirmación.", 429);

    const comentarioLimpio = typeof comentario === "string" ? comentario.trim().slice(0, 200) || null : null;
    const { error: errorConfirmacion } = await supabase.from("confirmacion").insert({
      reporte_id: id,
      identificador,
      tipo,
      comentario: comentarioLimpio,
    });

    if (errorConfirmacion?.code === "23505") return NextResponse.json({ ok: true, repetida: true });
    if (errorConfirmacion) throw errorConfirmacion;

    const { error: errorEvento } = await supabase.from("evento_reporte").insert({
      reporte_id: id,
      tipo_evento: tipo === "afectado" ? "confirmacion_afectado" : "confirmacion_resuelto",
      origen: "comunidad",
    });
    if (errorEvento) throw errorEvento;

    const { data: reportePublico, error: errorPublico } = await supabase
      .from("reporte_publico")
      .select("confirmaciones")
      .eq("id", id)
      .single();
    if (errorPublico) throw errorPublico;

    return NextResponse.json({ ok: true, confirmaciones: reportePublico.confirmaciones });
  } catch (error) {
    console.error("No se pudo guardar la confirmación:", error);
    return respuestaError("No se pudo guardar tu confirmación. Intenta de nuevo.");
  }
}
