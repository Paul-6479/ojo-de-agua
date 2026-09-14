import { NextResponse } from "next/server";
import { crearClientePublico } from "@/lib/supabase";
import type { TipoProblema } from "@/lib/tipos";
import { CATALOGO_TIPOS } from "@/lib/tipos";

export async function GET(solicitud: Request) {
  const url = new URL(solicitud.url);
  const latitud = Number(url.searchParams.get("lat"));
  const longitud = Number(url.searchParams.get("lon"));
  const tipo = url.searchParams.get("tipo");
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return NextResponse.json({ ok: false, error: "Ubicación no válida." }, { status: 400 });
  }

  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase.rpc("reportes_cercanos", {
      lat: latitud,
      lon: longitud,
      radio_metros: 75,
      dias: 30,
    });
    if (error) {
      console.error("No se pudieron buscar reportes cercanos:", error);
      return NextResponse.json({ ok: false, error: "No se pudieron buscar reportes cercanos." }, { status: 500 });
    }

    const reportes = tipo && tipo in CATALOGO_TIPOS
      ? (data ?? []).filter((reporte: { tipo: TipoProblema }) => reporte.tipo === (tipo as TipoProblema))
      : data ?? [];
    return NextResponse.json(reportes, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    console.error("Error inesperado al buscar reportes cercanos:", error);
    return NextResponse.json({ ok: false, error: "No se pudieron buscar reportes cercanos." }, { status: 500 });
  }
}
