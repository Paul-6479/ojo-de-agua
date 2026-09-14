import { NextResponse } from "next/server";
import { crearClientePublico, crearClienteServidor } from "@/lib/supabase";
import type { ReportePublico } from "@/lib/tipos";
import { validarReporte } from "@/lib/validarReporte";

async function hashSha256(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function respuestaError(mensaje: string, estatus = 500) {
  return NextResponse.json({ ok: false, error: mensaje }, { status: estatus });
}

export async function GET() {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("reporte_publico")
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(500);

    if (error) {
      console.error("No se pudieron leer los reportes públicos:", error);
      return respuestaError("No se pudieron cargar los reportes.");
    }

    const features = ((data ?? []) as ReportePublico[]).map((reporte) => ({
      type: "Feature" as const,
      properties: reporte,
      geometry: { type: "Point" as const, coordinates: [reporte.longitud, reporte.latitud] },
    }));

    return NextResponse.json(
      { type: "FeatureCollection", features },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch (error) {
    console.error("Error inesperado al listar reportes:", error);
    return respuestaError("No se pudieron cargar los reportes.");
  }
}

export async function POST(solicitud: Request) {
  try {
    let entrada: unknown;
    try {
      entrada = await solicitud.json();
    } catch {
      return respuestaError("Los datos enviados no son válidos.", 400);
    }

    const validacion = validarReporte(entrada);
    if (!validacion.ok) {
      if (validacion.error === "Honeypot activado") {
        return NextResponse.json({ ok: true, folio: "OJO-0000-0000" });
      }
      return respuestaError(validacion.error, 400);
    }

    const datos = validacion.datos;
    const hashDispositivo = await hashSha256(datos.token);
    // La columna ip es de tipo inet: si no conocemos la IP se guarda null, no un texto.
    const ip = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const supabase = crearClienteServidor();
    const haceDiezMinutos = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: cantidadIntentos, error: errorIntentos } = await supabase
      .from("intento")
      .select("id", { count: "exact", head: true })
      .gte("creado_en", haceDiezMinutos)
      .or(ip ? `hash_dispositivo.eq.${hashDispositivo},ip.eq.${ip}` : `hash_dispositivo.eq.${hashDispositivo}`);

    if (errorIntentos) {
      console.error("No se pudo revisar el límite de tasa:", errorIntentos);
      return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
    }

    if ((cantidadIntentos ?? 0) >= 3) {
      return respuestaError("Espera unos minutos antes de enviar otro reporte", 429);
    }

    const { error: errorRegistrarIntento } = await supabase.from("intento").insert({
      hash_dispositivo: hashDispositivo,
      ip,
    });
    if (errorRegistrarIntento) {
      console.error("No se pudo registrar el intento:", errorRegistrarIntento);
      return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
    }

    const { data: municipio, error: errorMunicipio } = await supabase.rpc("municipio_de_punto", {
      lat: datos.latitud,
      lon: datos.longitud,
    });
    if (errorMunicipio) {
      console.error("No se pudo revisar el municipio:", errorMunicipio);
      return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
    }

    const fueraDeZona = municipio === null;
    const estatus = fueraDeZona ? "rechazado" : "recibido";
    const { data: reporte, error: errorReporte } = await supabase
      .from("reporte")
      .insert({
        tipo: datos.tipo,
        severidad: datos.severidad,
        descripcion: datos.descripcion,
        latitud: datos.latitud,
        longitud: datos.longitud,
        precision_gps_m: datos.precision_gps_m,
        pin_movido: datos.pin_movido,
        referencia: datos.referencia,
        colonia: datos.colonia,
        municipio: municipio ?? null,
        hash_reportante: hashDispositivo,
        estatus,
        visible: !fueraDeZona,
      })
      .select("id, folio")
      .single();

    if (errorReporte || !reporte) {
      console.error("No se pudo crear el reporte:", errorReporte);
      return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
    }

    const { error: errorEvento } = await supabase.from("evento_reporte").insert({
      reporte_id: reporte.id,
      tipo_evento: "creacion",
      estatus_nuevo: estatus,
      origen: "ciudadano",
      nota: fueraDeZona ? "Fuera de la zona conurbada" : null,
    });
    if (errorEvento) {
      console.error("No se pudo registrar la bitácora:", errorEvento);
      return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
    }

    return NextResponse.json({
      ok: true,
      folio: reporte.folio,
      id: reporte.id,
      publicado: !fueraDeZona,
      fuera_de_zona: fueraDeZona,
      mensaje: fueraDeZona ? "La ubicación está fuera de Tampico–Madero–Altamira y no se publicará." : undefined,
    });
  } catch (error) {
    console.error("Error inesperado al crear reporte:", error);
    return respuestaError("No se pudo guardar el reporte. Intenta de nuevo.");
  }
}
