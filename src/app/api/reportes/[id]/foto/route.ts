import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";

async function hashSha256(texto: string) {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const formulario = await solicitud.formData();
    const archivo = formulario.get("archivo");
    const token = formulario.get("token");
    if (!(archivo instanceof Blob) || typeof token !== "string" || !token) {
      return NextResponse.json({ ok: false, error: "Falta la foto o el identificador del dispositivo." }, { status: 400 });
    }
    if (archivo.size > 3 * 1024 * 1024 || !["image/jpeg", "image/webp"].includes(archivo.type)) {
      return NextResponse.json({ ok: false, error: "La foto debe ser JPEG o WebP y pesar máximo 3 MB." }, { status: 400 });
    }

    const supabase = crearClienteServidor();
    const { data: reporte, error: errorReporte } = await supabase
      .from("reporte")
      .select("hash_reportante")
      .eq("id", id)
      .single();
    if (errorReporte || !reporte || reporte.hash_reportante !== await hashSha256(token)) {
      return NextResponse.json({ ok: false, error: "No puedes adjuntar fotos a este reporte." }, { status: 403 });
    }

    const { count, error: errorConteo } = await supabase.from("foto").select("id", { count: "exact", head: true }).eq("reporte_id", id);
    if (errorConteo) {
      console.error("No se pudo revisar el número de fotos:", errorConteo);
      return NextResponse.json({ ok: false, error: "No se pudo subir la foto." }, { status: 500 });
    }
    if ((count ?? 0) >= 3) return NextResponse.json({ ok: false, error: "Este reporte ya tiene tres fotos." }, { status: 400 });

    const rutaStorage = `${id}/${crypto.randomUUID()}.jpg`;
    const { error: errorSubida } = await supabase.storage.from("fotos-reportes").upload(rutaStorage, archivo, { contentType: archivo.type });
    if (errorSubida) {
      console.error("No se pudo subir la foto:", errorSubida);
      return NextResponse.json({ ok: false, error: "No se pudo subir la foto." }, { status: 500 });
    }
    const { error: errorFoto } = await supabase.from("foto").insert({ reporte_id: id, ruta_storage: rutaStorage, momento: "antes", aprobada: false });
    if (errorFoto) {
      console.error("No se pudo registrar la foto:", errorFoto);
      await supabase.storage.from("fotos-reportes").remove([rutaStorage]);
      return NextResponse.json({ ok: false, error: "No se pudo subir la foto." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error inesperado al subir foto:", error);
    return NextResponse.json({ ok: false, error: "No se pudo subir la foto." }, { status: 500 });
  }
}
