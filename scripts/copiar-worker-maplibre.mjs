// Copia el worker de MapLibre a public/ para servirlo como archivo estático.
//
// Por qué: MapLibre 6 localiza su web worker con `import.meta.url`, pero
// Turbopack (el empaquetador de Next 16) no le da una URL http a ese valor,
// así que el worker nunca arranca y el mapa se queda en blanco sin error.
// `src/components/Mapa.tsx` apunta a estos archivos con `setWorkerUrl`.
// Se corre solo antes de `npm run dev` y `npm run build` (ver package.json).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "maplibre-gl", "dist");
const destino = join(raiz, "public", "maplibre");

mkdirSync(destino, { recursive: true });
for (const archivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(origen, archivo), join(destino, archivo));
}
