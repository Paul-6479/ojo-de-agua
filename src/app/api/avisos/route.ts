import { NextResponse } from "next/server";
import { crearClientePublico } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase.rpc("avisos_vigentes");
    if (error) throw error;
    return NextResponse.json(
      { ok: true, avisos: data ?? [] },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } },
    );
  } catch (error) {
    console.error("No se pudieron leer los avisos:", error);
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los avisos." }, { status: 500 });
  }
}
