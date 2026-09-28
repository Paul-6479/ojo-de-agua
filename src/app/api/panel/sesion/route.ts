import { NextResponse } from "next/server";
import { crearClienteSesion } from "@/lib/sesion";

// Entrar y salir del panel. La cookie de sesión la escribe el cliente de
// @supabase/ssr; aquí solo se le pasan las credenciales.
export async function POST(solicitud: Request) {
  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const { correo, contrasena } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof correo !== "string" || typeof contrasena !== "string" || !correo || !contrasena) {
    return NextResponse.json({ ok: false, error: "Escribe tu correo y tu contraseña." }, { status: 400 });
  }

  const supabase = await crearClienteSesion();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });

  if (error) {
    // No se distingue entre "no existe" y "contraseña incorrecta": eso delataría
    // qué correos tienen cuenta.
    return NextResponse.json({ ok: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await crearClienteSesion();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
