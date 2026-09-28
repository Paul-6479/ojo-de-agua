import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { crearClienteServidor } from "@/lib/supabase";
import type { RolUsuario } from "@/lib/tipos";

// La sesión de Supabase Auth vive en cookies. Este cliente usa la clave anon
// (no service_role): solo sirve para saber QUIÉN es quien pide, nunca para escribir.
// Las escrituras siguen pasando por crearClienteServidor(), como manda AGENTS.md.
export async function crearClienteSesion() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(galletas) {
          // En un Server Component leer está permitido pero escribir no; el
          // refresco de la sesión lo hace el proxy, así que aquí se ignora el error.
          try {
            galletas.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {
            // Sin acción: la petición era de solo lectura.
          }
        },
      },
    },
  );
}

export type Operador = {
  id: string;
  correo: string;
  rol: RolUsuario;
};

// Devuelve el usuario con su rol, o null si no hay sesión válida.
// Siempre usa getUser(), que verifica el token contra Supabase; getSession() lee
// la cookie sin validarla y un atacante podría falsificarla.
export async function obtenerUsuarioSesion(): Promise<Operador | null> {
  const supabase = await crearClienteSesion();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const servidor = crearClienteServidor();
  const { data: fila } = await servidor
    .from("usuario")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    correo: data.user.email ?? "",
    // Quien tiene cuenta pero no fila en `usuario` es un ciudadano normal.
    rol: (fila?.rol as RolUsuario) ?? "ciudadano",
  };
}

const ROLES_DEL_PANEL: RolUsuario[] = ["moderador", "operador", "admin"];

export function puedeEntrarAlPanel(usuario: Operador | null) {
  return usuario !== null && ROLES_DEL_PANEL.includes(usuario.rol);
}

// Para las rutas de API: devuelve el operador o null, sin redirigir.
export async function exigirOperador() {
  const usuario = await obtenerUsuarioSesion();
  return puedeEntrarAlPanel(usuario) ? usuario : null;
}
