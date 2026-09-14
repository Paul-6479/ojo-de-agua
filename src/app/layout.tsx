import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ojo de Agua · Reporte ciudadano del agua",
  description:
    "Reporta fugas y problemas de agua en Tampico, Ciudad Madero y Altamira. Proyecto ciudadano independiente, no es un canal oficial de COMAPA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
