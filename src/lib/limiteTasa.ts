import type { SupabaseClient } from "@supabase/supabase-js";

export async function revisarYRegistrarIntento(
  supabase: SupabaseClient,
  solicitud: Request,
  hashDispositivo: string,
) {
  const ip = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const haceDiezMinutos = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const filtro = ip
    ? `hash_dispositivo.eq.${hashDispositivo},ip.eq.${ip}`
    : `hash_dispositivo.eq.${hashDispositivo}`;

  const { count, error } = await supabase
    .from("intento")
    .select("id", { count: "exact", head: true })
    .gte("creado_en", haceDiezMinutos)
    .or(filtro);

  if (error) throw error;
  if ((count ?? 0) >= 3) return false;

  const { error: errorRegistro } = await supabase.from("intento").insert({
    hash_dispositivo: hashDispositivo,
    ip,
  });
  if (errorRegistro) throw errorRegistro;

  return true;
}
