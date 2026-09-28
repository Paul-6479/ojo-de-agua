import { NextResponse } from "next/server";
import { crearClientePublico } from "@/lib/supabase";

// Agregados públicos para la portada. Se cachean como el GeoJSON del mapa:
// son cifras de tendencia, no hace falta que estén al segundo.
export async function GET() {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase.rpc("estadisticas_publicas");
    if (error) throw error;

    return NextResponse.json(
      { ok: true, estadisticas: data },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (error) {
    console.error("No se pudieron calcular las estadísticas:", error);
    return NextResponse.json({ ok: false, error: "No se pudieron calcular las cifras." }, { status: 500 });
  }
}
