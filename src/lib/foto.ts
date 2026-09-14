"use client";

export async function comprimirFoto(archivo: File): Promise<Blob> {
  // Redibujar elimina EXIF (incluidas coordenadas GPS) y reduce el peso para mala señal.
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const ladoMaximo = 1200;
  const proporcion = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * proporcion);
  canvas.height = Math.round(imagen.height * proporcion);

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar la foto.");

  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((resultado) => {
      if (resultado) resolve(resultado);
      else reject(new Error("No se pudo comprimir la foto."));
    }, "image/jpeg", 0.8);
  });
}
