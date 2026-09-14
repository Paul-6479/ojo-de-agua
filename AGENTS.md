<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ojo de Agua — reglas para agentes de código (Codex y Claude)

**Lee `CLAUDE.md` completo antes de escribir nada.** Es el documento maestro:
qué es el proyecto, decisiones ya tomadas, modelo de datos, API y plan. Este
archivo solo resume lo que un agente necesita tener enfrente mientras codifica.

## Stack fijo — NO cambiar ni proponer alternativas

Next.js 16 (App Router, TypeScript, carpeta `src/`, alias `@/*`) · Tailwind CSS 4
· Supabase (PostgreSQL + PostGIS, Auth, Storage) · MapLibre GL JS + teselas de
MapTiler · Vercel. **Prohibido:** Google Maps, Mapbox GL, Leaflet, Prisma,
Drizzle, ORMs en general, librerías de estado global, librerías de UI
(shadcn, MUI, etc.). Si algo parece faltar, se resuelve con lo que ya hay.

## Reglas de código

- **Todo en español de México:** interfaz, comentarios, nombres de archivos y de
  variables de dominio (`reporte`, `folio`, `confirmacion`). Los identificadores
  técnicos de librerías se quedan como son.
- **Legible para alguien que no conoce React.** El autor va a aprender leyendo
  este código. Nada de abstracciones ingeniosas, HOCs, genéricos rebuscados ni
  one-liners densos. Componentes chicos con nombres obvios.
- Comentarios solo donde el *porqué* no sea evidente. No comentar el *qué*.
- **Mobile-first.** Cada pantalla se diseña para teléfono con una mano y sol
  directo; el escritorio es la adaptación, no al revés.
- No instalar dependencias que no estén en `CLAUDE.md` sin justificarlo en el
  reporte de entrega.

## Reglas de seguridad y datos (ver §5 y §7 de CLAUDE.md)

- El navegador **nunca escribe** en Supabase. Toda escritura pasa por rutas de
  servidor (`src/app/api/**/route.ts`) que usan el cliente con
  `SUPABASE_SERVICE_ROLE_KEY`. Ese cliente **solo** se importa desde código de
  servidor.
- El navegador solo lee la vista `reporte_publico`, nunca la tabla `reporte`.
- Toda entrada del usuario se valida en el servidor.
- **Nunca** escribir credenciales reales en ningún archivo. Las variables van
  en `.env.local` (ignorado por git) y se documentan en `.env.local.example`.
- Nunca mostrar nombre, contacto ni ubicación exacta del reportante en público.

## Next.js 16 — lo que cambió respecto a lo que traes aprendido

Antes de tocar rutas, layouts o caché, lee la guía correspondiente en
`node_modules/next/dist/docs/01-app/`. Puntos que ya se verificaron ahí:

- `params` y `searchParams` en páginas y route handlers son **promesas**: hay
  que hacer `await ctx.params` (`01-getting-started/15-route-handlers.md`).
- **`middleware.ts` ya no existe; ahora se llama `proxy.ts`**
  (`01-getting-started/16-proxy.md`).
- Los route handlers `GET` **no se cachean por defecto**; para cachear el
  GeoJSON del mapa usar `Cache-Control` en la respuesta o la configuración
  descrita en `02-guides/caching-without-cache-components.md`.
- `'use cache'` no puede ir dentro del cuerpo de un route handler; se extrae a
  una función auxiliar.
- Los tipos de props de layouts/páginas son `LayoutProps<"/">` y
  `PageProps<"/ruta">` (ver `src/app/layout.tsx`).

## Verificación obligatoria antes de reportar que algo está terminado

1. `npm run build` compila sin errores ni warnings nuevos.
2. `npm run lint` pasa.
3. Todos los archivos prometidos existen (`find src db -type f`).
4. El reporte de entrega lista **cada archivo creado o modificado** y cualquier
   desviación respecto a lo pedido. No reportar como hecho algo que no se hizo.
