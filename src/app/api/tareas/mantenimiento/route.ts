import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";

// Tarea diaria (§6 de CLAUDE.md). Hace dos cosas útiles y, de paso, evita que
// Supabase pause el proyecto por inactividad: el plan gratuito lo duerme tras
// ~1 semana sin actividad, y el peor escenario es llegar dormido a la
// presentación. Un update real es mejor keep-alive que un "select 1".
export async function GET(solicitud: Request) {
  // Vercel manda la variable CRON_SECRET como encabezado Authorization. Sin esta
  // comprobación la ruta quedaría abierta a cualquiera en internet.
  const autorizacion = solicitud.headers.get("authorization");
  const secreto = process.env.CRON_SECRET;
  if (!secreto || autorizacion !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const supabase = crearClienteServidor();
    const { data, error } = await supabase.rpc("mantenimiento_diario");
    if (error) throw error;

    // El resumen se devuelve legible a propósito: abrir esta URL de vez en cuando
    // es la única forma de notar que la tarea dejó de correr.
    return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
  } catch (error) {
    console.error("Falló el mantenimiento diario:", error);
    return NextResponse.json({ ok: false, error: "Falló el mantenimiento." }, { status: 500 });
  }
}
