import type { Metadata, Viewport } from "next";
import RegistroServiceWorker from "@/components/RegistroServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ojo de Agua · Reporte ciudadano del agua",
  description:
    "Reporta fugas y problemas de agua en Tampico, Ciudad Madero y Altamira. Proyecto ciudadano independiente, no es un canal oficial de COMAPA.",
  applicationName: "Ojo de Agua",
  appleWebApp: { capable: true, title: "Ojo de Agua", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Ojo de Agua · Reporte ciudadano del agua",
    description: "El mapa público de fugas y problemas de agua de la zona conurbada de Tampico.",
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#082f49",
  // Se permite el zoom: prohibirlo rompe la accesibilidad de quien no ve bien.
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Primer enlace de la página: quien navega con teclado o lector de
            pantalla puede saltarse el encabezado y los filtros. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-sky-950"
        >
          Saltar al contenido
        </a>
        {children}
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
