import { ImageResponse } from "next/og";

// Los iconos se dibujan aquí en vez de guardar archivos PNG binarios en el repo:
// así el icono se edita como código y no hace falta un editor de imágenes.
export function dibujarIcono(tamano: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#082f49",
          color: "#7dd3fc",
          fontSize: Math.round(tamano * 0.6),
        }}
      >
        💧
      </div>
    ),
    { width: tamano, height: tamano },
  );
}
