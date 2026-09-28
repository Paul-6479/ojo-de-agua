import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Antes se llamaba middleware.ts; en Next.js 16 el archivo es proxy.ts.
// Su único trabajo aquí es refrescar la cookie de sesión de Supabase antes de que
// la página se renderice. La autorización de verdad (el rol) se revisa en cada
// página y ruta del panel, no aquí: el proxy no es una barrera de seguridad.
export async function proxy(solicitud: NextRequest) {
  let respuesta = NextResponse.next({ request: solicitud });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return solicitud.cookies.getAll();
        },
        setAll(galletas) {
          galletas.forEach(({ name, value }) => solicitud.cookies.set(name, value));
          respuesta = NextResponse.next({ request: solicitud });
          galletas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();
  return respuesta;
}

export const config = {
  // Solo el panel necesita sesión; el mapa y el flujo de reporte son anónimos.
  matcher: ["/panel/:path*", "/api/panel/:path*"],
};
