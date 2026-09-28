import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase";
import { TRANSICIONES, type EstatusReporte } from "@/lib/tipos";

export async function POST(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador) return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const { reporteId, estatusNuevo, nota } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof reporteId !== "string" || typeof estatusNuevo !== "string") {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }
  if (nota !== undefined && typeof nota !== "string") {
    return NextResponse.json({ ok: false, error: "La nota no es válida." }, { status: 400 });
  }

  const supabase = crearClienteServidor();
  try {
    const { data: reporte, error: errorReporte } = await supabase
      .from("reporte")
      .select("folio, estatus")
      .eq("id", reporteId)
      .maybeSingle();
    if (errorReporte) throw errorReporte;
    if (!reporte) return NextResponse.json({ ok: false, error: "El reporte no existe." }, { status: 404 });

    // La transición se valida en el servidor: el <select> del navegador es una
    // sugerencia, no una garantía.
    const permitidas = TRANSICIONES[reporte.estatus as EstatusReporte] ?? [];
    if (!permitidas.includes(estatusNuevo as EstatusReporte)) {
      return NextResponse.json(
        { ok: false, error: `No se puede pasar de ${reporte.estatus} a ${estatusNuevo}.` },
        { status: 409 },
      );
    }

    // Cerrar exige evidencia: al menos una foto del "después" aprobada (§7.3).
    if (estatusNuevo === "cerrado") {
      const { count, error: errorFotos } = await supabase
        .from("foto")
        .select("id", { count: "exact", head: true })
        .eq("reporte_id", reporteId)
        .eq("momento", "despues")
        .eq("aprobada", true);
      if (errorFotos) throw errorFotos;
      if ((count ?? 0) === 0) {
        return NextResponse.json(
          { ok: false, error: "Para cerrar hace falta subir al menos una foto del trabajo terminado." },
          { status: 409 },
        );
      }
    }

    const { error } = await supabase.rpc("cambiar_estatus_reporte", {
      p_reporte_id: reporteId,
      p_estatus_nuevo: estatusNuevo,
      p_autor_id: operador.id,
      p_rol: operador.rol,
      p_nota: typeof nota === "string" ? nota.slice(0, 500) : null,
      p_fecha_estimada: null,
    });
    if (error) throw error;

    revalidatePath(`/reporte/${reporte.folio}`);
    revalidatePath(`/panel/reporte/${reporte.folio}`);
    revalidatePath("/panel");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo cambiar el estatus:", error);
    return NextResponse.json({ ok: false, error: "No se pudo cambiar el estatus." }, { status: 500 });
  }
}
