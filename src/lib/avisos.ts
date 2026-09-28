export type TipoAviso = "corte" | "tandeo" | "baja_presion" | "mantenimiento" | "informativo";

export type AvisoPublico = {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: TipoAviso;
  municipios: string[];
  colonias: string[];
  vigente_desde: string | null;
  vigente_hasta: string | null;
  fuente: string | null;
  creado_en: string;
};

export const CATALOGO_AVISOS: Record<TipoAviso, { etiqueta: string; emoji: string; color: string }> = {
  corte: { etiqueta: "Corte de agua", emoji: "🚫", color: "#b91c1c" },
  tandeo: { etiqueta: "Tandeo", emoji: "🕐", color: "#c2410c" },
  baja_presion: { etiqueta: "Baja presión", emoji: "〰️", color: "#a16207" },
  mantenimiento: { etiqueta: "Mantenimiento", emoji: "🔧", color: "#1d4ed8" },
  informativo: { etiqueta: "Aviso", emoji: "📢", color: "#0f766e" },
};

export const NOMBRE_MUNICIPIO_AVISO: Record<string, string> = {
  tampico: "Tampico",
  madero: "Cd. Madero",
  altamira: "Altamira",
};

export function vigenciaLegible(aviso: AvisoPublico) {
  const formato = (valor: string) =>
    new Date(valor).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

  if (aviso.vigente_desde && aviso.vigente_hasta) {
    return `Del ${formato(aviso.vigente_desde)} al ${formato(aviso.vigente_hasta)}`;
  }
  if (aviso.vigente_hasta) return `Hasta ${formato(aviso.vigente_hasta)}`;
  if (aviso.vigente_desde) return `Desde ${formato(aviso.vigente_desde)}`;
  return "Sin fecha de vigencia";
}

export function zonaLegible(aviso: AvisoPublico) {
  const municipios = aviso.municipios.map((clave) => NOMBRE_MUNICIPIO_AVISO[clave] ?? clave);
  const partes = [...aviso.colonias, ...municipios];
  return partes.length > 0 ? partes.join(" · ") : "Zona no especificada";
}
