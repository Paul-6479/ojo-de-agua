import type { SupabaseClient } from "@supabase/supabase-js";

// Cada acción tiene su propio cupo: reportar y confirmar no compiten entre sí.
// Si compartieran balde, el flujo "reporto → me avisa de un duplicado → confirmo"
// gastaría el cupo en segundos y bloquearía al vecino (§7.1 y §7.2 de CLAUDE.md).
export const LIMITE_REPORTES = 3;
export const LIMITE_CONFIRMACIONES = 15;

const VENTANA_MINUTOS = 10;
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

// La columna intento.ip es de tipo inet y el valor se interpola en un filtro de
// PostgREST: un encabezado x-forwarded-for inventado ("hola", "1.1.1.1)") rompía
// la consulta y devolvía 500. Lo que no parece una IP se trata como desconocido.
export function leerIp(solicitud: Request) {
  const crudo = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!crudo) return null;
  if (IPV4.test(crudo) && crudo.split(".").every((parte) => Number(parte) <= 255)) return crudo;
  if (crudo.includes(":") && IPV6.test(crudo)) return crudo;
  return null;
}

export type Accion = "reporte" | "confirmacion";

export async function revisarLimite(
  supabase: SupabaseClient,
  hashDispositivo: string,
  ip: string | null,
  accion: Accion,
  limite: number,
) {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60 * 1000).toISOString();
  const filtro = ip
    ? `hash_dispositivo.eq.${hashDispositivo},ip.eq.${ip}`
    : `hash_dispositivo.eq.${hashDispositivo}`;

  const { count, error } = await supabase
    .from("intento")
    .select("id", { count: "exact", head: true })
    .eq("accion", accion)
    .gte("creado_en", desde)
    .or(filtro);

  if (error) throw error;
  return (count ?? 0) < limite;
}

export async function registrarIntento(
  supabase: SupabaseClient,
  hashDispositivo: string,
  ip: string | null,
  accion: Accion,
) {
  const { error } = await supabase.from("intento").insert({
    hash_dispositivo: hashDispositivo,
    ip,
    accion,
  });
  if (error) throw error;
}

// Atajo para crear reportes, donde revisar y registrar siempre van juntos.
export async function revisarYRegistrarIntento(
  supabase: SupabaseClient,
  solicitud: Request,
  hashDispositivo: string,
) {
  const ip = leerIp(solicitud);
  const permitido = await revisarLimite(supabase, hashDispositivo, ip, "reporte", LIMITE_REPORTES);
  if (!permitido) return false;
  await registrarIntento(supabase, hashDispositivo, ip, "reporte");
  return true;
}
