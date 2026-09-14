import { createClient } from "@supabase/supabase-js";

function leerVariable(nombre: string) {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta ${nombre}. Revísala en .env.local.example.`);
  }

  return valor;
}

export function crearClientePublico() {
  return createClient(
    leerVariable("NEXT_PUBLIC_SUPABASE_URL"),
    leerVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

// Solo se importa desde rutas en src/app/api/** para no enviar service_role al navegador.
export function crearClienteServidor() {
  if (typeof window !== "undefined") {
    throw new Error("El cliente de servidor no puede usarse en el navegador.");
  }

  return createClient(
    leerVariable("NEXT_PUBLIC_SUPABASE_URL"),
    leerVariable("SUPABASE_SERVICE_ROLE_KEY"),
  );
}
