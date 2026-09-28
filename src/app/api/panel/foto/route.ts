import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/webp"];

// Sube la evidencia del "después". La foto llega ya recomprimida por el navegador,
// así que viene sin EXIF (§7.4).
export async function POST(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador) return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });

  const formulario = await solicitud.formData();
  const archivo = formulario.get("archivo");
  const reporteId = formulario.get("reporteId");
  if (!(archivo instanceof Blob) || typeof reporteId !== "string" || !reporteId) {
    return NextResponse.json({ ok: false, error: "Falta la foto o el reporte." }, { status: 400 });
  }
  if (archivo.size > 3 * 1024 * 1024 || !TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ ok: false, error: "La foto debe ser JPEG o WebP y pesar máximo 3 MB." }, { status: 400 });
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

    const rutaStorage = `${reporteId}/${crypto.randomUUID()}.jpg`;
    const { error: errorSubida } = await supabase.storage
      .from("fotos-reportes")
      .upload(rutaStorage, archivo, { contentType: archivo.type });
    if (errorSubida) throw errorSubida;

    // La evidencia de COMAPA entra ya aprobada: la subió una persona identificada.
    const { error: errorFoto } = await supabase.from("foto").insert({
      reporte_id: reporteId,
      ruta_storage: rutaStorage,
      momento: "despues",
      aprobada: true,
      subida_por: operador.id,
    });
    if (errorFoto) {
      await supabase.storage.from("fotos-reportes").remove([rutaStorage]);
      throw errorFoto;
    }

    revalidatePath(`/reporte/${reporte.folio}`);
    revalidatePath(`/panel/reporte/${reporte.folio}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo subir la evidencia:", error);
    return NextResponse.json({ ok: false, error: "No se pudo subir la foto." }, { status: 500 });
  }
}

// Aprobar u ocultar una foto ciudadana: moderación de privacidad (§7.4).
export async function PATCH(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador) return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const { fotoId, aprobada } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof fotoId !== "string" || typeof aprobada !== "boolean") {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const supabase = crearClienteServidor();
  try {
    const { data, error } = await supabase
      .from("foto")
      .update({ aprobada })
      .eq("id", fotoId)
      .select("reporte_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "La foto no existe." }, { status: 404 });

    const { data: reporte } = await supabase.from("reporte").select("folio").eq("id", data.reporte_id).maybeSingle();
    if (reporte) {
      revalidatePath(`/reporte/${reporte.folio}`);
      revalidatePath(`/panel/reporte/${reporte.folio}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo moderar la foto:", error);
    return NextResponse.json({ ok: false, error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}
