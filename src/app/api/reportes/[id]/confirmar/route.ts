import { NextResponse } from "next/server";
import { hashSha256 } from "@/lib/hash";
import {
  LIMITE_CONFIRMACIONES,
  leerIp,
  registrarIntento,
  revisarLimite,
} from "@/lib/limiteTasa";
import { crearClienteServidor } from "@/lib/supabase";

function respuestaError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Solo comprueba la forma de un UUID; no se exige versión ni variante para no
// rechazar identificadores válidos generados de otra manera (semillas, UUID v7).
function esUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
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
    const ip = leerIp(solicitud);
    const permitido = await revisarLimite(supabase, identificador, ip, "confirmacion", LIMITE_CONFIRMACIONES);
    if (!permitido) return respuestaError("Espera unos minutos antes de enviar otra confirmación.", 429);

    const comentarioLimpio = typeof comentario === "string" ? comentario.trim().slice(0, 200) || null : null;
    // La función guarda la confirmación y su renglón de bitácora en una sola
    // transacción, y devuelve los conteos ya recalculados.
    const { data, error } = await supabase
      .rpc("registrar_confirmacion", {
        p_reporte_id: id,
        p_identificador: identificador,
        p_tipo: tipo,
        p_comentario: comentarioLimpio,
      })
      .single<{ repetida: boolean; confirmaciones: number; resueltos: number }>();
    if (error) throw error;

    // Una confirmación repetida no gasta cupo: no cambió nada en la base.
    if (!data.repetida) await registrarIntento(supabase, identificador, ip, "confirmacion");

    return NextResponse.json({
      ok: true,
      repetida: data.repetida,
      confirmaciones: data.confirmaciones,
    });
  } catch (error) {
    console.error("No se pudo guardar la confirmación:", error);
    return respuestaError("No se pudo guardar tu confirmación. Intenta de nuevo.");
  }
}
