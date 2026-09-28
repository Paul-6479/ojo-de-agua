import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador) return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });
  // Solo COMAPA compromete fechas; un moderador no puede inventarlas (§7.3).
  if (operador.rol === "moderador") {
    return NextResponse.json({ ok: false, error: "Solo un operador de COMAPA puede comprometer fechas." }, { status: 403 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const { reporteId, fecha, nota } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof reporteId !== "string" || typeof fecha !== "string" || !FECHA_ISO.test(fecha)) {
    return NextResponse.json({ ok: false, error: "La fecha no es válida." }, { status: 400 });
  }
  if (Number.isNaN(new Date(`${fecha}T12:00:00`).getTime())) {
    return NextResponse.json({ ok: false, error: "La fecha no es válida." }, { status: 400 });
  }
  if (nota !== undefined && typeof nota !== "string") {
    return NextResponse.json({ ok: false, error: "La nota no es válida." }, { status: 400 });
  }

  const supabase = crearClienteServidor();
  try {
    const { data: reporte, error: errorReporte } = await supabase
      .from("reporte")
      .select("folio")
      .eq("id", reporteId)
      .maybeSingle();
    if (errorReporte) throw errorReporte;
    if (!reporte) return NextResponse.json({ ok: false, error: "El reporte no existe." }, { status: 404 });

    const { error } = await supabase.rpc("fijar_fecha_estimada", {
      p_reporte_id: reporteId,
      p_fecha: fecha,
      p_autor_id: operador.id,
      p_rol: operador.rol,
      p_nota: typeof nota === "string" ? nota.slice(0, 500) : null,
    });
    if (error) throw error;

    revalidatePath(`/reporte/${reporte.folio}`);
    revalidatePath(`/panel/reporte/${reporte.folio}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo fijar la fecha estimada:", error);
    return NextResponse.json({ ok: false, error: "No se pudo guardar la fecha." }, { status: 500 });
  }
}
