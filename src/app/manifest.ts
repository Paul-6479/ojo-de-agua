import type { MetadataRoute } from "next";

// Hace la app instalable en el teléfono: quien reporta seguido la abre desde el
// escritorio y no desde el navegador (§7.5 de CLAUDE.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ojo de Agua · Reporte ciudadano del agua",
    short_name: "Ojo de Agua",
    description:
      "Reporta fugas y problemas de agua en Tampico, Ciudad Madero y Altamira. Proyecto ciudadano independiente.",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f9ff",
    theme_color: "#082f49",
    lang: "es-MX",
    orientation: "portrait",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Reportar un problema", short_name: "Reportar", url: "/reportar" },
      { name: "Seguir un reporte", short_name: "Seguir", url: "/seguir" },
    ],
  };
}
