import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase";

const TIPOS = ["corte", "tandeo", "baja_presion", "mantenimiento", "informativo"];
const MUNICIPIOS = ["tampico", "madero", "altamira"];

function textoLimpio(valor: unknown, maximo: number) {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}

export async function POST(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador) return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });
  // Publicar un aviso es hablarle a toda la ciudad: no lo hace un moderador.
  if (operador.rol === "moderador") {
    return NextResponse.json({ ok: false, error: "Solo un operador puede publicar avisos." }, { status: 403 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const cuerpoEntrada = (entrada ?? {}) as Record<string, unknown>;
  const titulo = textoLimpio(cuerpoEntrada.titulo, 140);
  const cuerpo = textoLimpio(cuerpoEntrada.cuerpo, 1000);
  const tipo = textoLimpio(cuerpoEntrada.tipo, 30);
  const fuente = textoLimpio(cuerpoEntrada.fuente, 140);

  if (titulo.length < 5) return NextResponse.json({ ok: false, error: "El título es muy corto." }, { status: 400 });
  if (cuerpo.length < 10) return NextResponse.json({ ok: false, error: "Explica el aviso con más detalle." }, { status: 400 });
  if (!TIPOS.includes(tipo)) return NextResponse.json({ ok: false, error: "El tipo de aviso no es válido." }, { status: 400 });

  const municipios = Array.isArray(cuerpoEntrada.municipios)
    ? cuerpoEntrada.municipios.filter((valor): valor is string => typeof valor === "string" && MUNICIPIOS.includes(valor))
    : [];
  if (municipios.length === 0) {
    return NextResponse.json({ ok: false, error: "Elige al menos un municipio afectado." }, { status: 400 });
  }

  const colonias = Array.isArray(cuerpoEntrada.colonias)
    ? cuerpoEntrada.colonias
        .filter((valor): valor is string => typeof valor === "string")
        .map((valor) => valor.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 30)
    : [];

  const desde = textoLimpio(cuerpoEntrada.vigenteDesde, 40) || null;
  const hasta = textoLimpio(cuerpoEntrada.vigenteHasta, 40) || null;
  for (const fecha of [desde, hasta]) {
    if (fecha && Number.isNaN(new Date(fecha).getTime())) {
      return NextResponse.json({ ok: false, error: "Las fechas no son válidas." }, { status: 400 });
    }
  }
  if (desde && hasta && new Date(hasta) <= new Date(desde)) {
    return NextResponse.json({ ok: false, error: "El fin de la vigencia debe ser después del inicio." }, { status: 400 });
  }

  const supabase = crearClienteServidor();
  try {
    const { error } = await supabase.from("aviso").insert({
      titulo,
      cuerpo,
      tipo,
      municipios,
      colonias,
      vigente_desde: desde,
      vigente_hasta: hasta,
      // Sin fuente declarada, el aviso se marca como del propio proyecto: nunca
      // se presenta como comunicado oficial de COMAPA si no lo es (§1).
      fuente: fuente || "Ojo de Agua (demostración)",
      creado_por: operador.id,
    });
    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/avisos");
    revalidatePath("/panel/avisos");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo publicar el aviso:", error);
    return NextResponse.json({ ok: false, error: "No se pudo publicar el aviso." }, { status: 500 });
  }
}

// Retirar un aviso no lo borra: deja de publicarse y queda el registro.
export async function PATCH(solicitud: Request) {
  const operador = await exigirOperador();
  if (!operador || operador.rol === "moderador") {
    return NextResponse.json({ ok: false, error: "No tienes permiso." }, { status: 403 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const { avisoId, publicado } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof avisoId !== "string" || typeof publicado !== "boolean") {
    return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });
  }

  const supabase = crearClienteServidor();
  try {
    const { error } = await supabase.from("aviso").update({ publicado }).eq("id", avisoId);
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/avisos");
    revalidatePath("/panel/avisos");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo actualizar el aviso:", error);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar el aviso." }, { status: 500 });
  }
}
