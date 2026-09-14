# Tanda 3 para Codex — «Ver y seguir» (semana 3)

Lee primero `AGENTS.md` y `CLAUDE.md` completos. Este documento cierra el
alcance de la tanda. **No cambies el stack, no instales dependencias, no
toques `db/schema.sql` salvo lo indicado en la parte D.** Todo en español de
México, legible para alguien que no conoce React, mobile-first.

Antes de escribir rutas o páginas lee
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
y la guía de páginas dinámicas: `params` es una **promesa** (`await params`)
y los tipos de props son `PageProps<"/reporte/[folio]">`.

Reutiliza lo que ya existe: `crearClienteServidor()` de `src/lib/supabase.ts`
(solo en rutas de servidor), `obtenerTokenDispositivo()` y
`leerFoliosRecientes()` de `src/lib/dispositivo.ts`, `CATALOGO_TIPOS`,
`CATALOGO_ESTATUS`, `ETIQUETA_ORIGEN` y `ReportePublico` de `src/lib/tipos.ts`,
y el patrón de `src/app/api/reportes/route.ts` para respuestas
`{ ok, ... }` y cabeceras de caché.

## A. Ficha pública por folio — `src/app/reporte/[folio]/page.tsx`

Server Component (sin `"use client"`) que recibe `folio` en la URL
(`/reporte/OJO-2026-0001`). Normaliza el folio a mayúsculas y valida el
formato `OJO-\d{4}-\d{4}`; si no cumple o no existe, `notFound()`.

Datos: crea `src/lib/consultas.ts` con una función de servidor
`obtenerFichaPorFolio(folio)` que use `crearClienteServidor()` y devuelva:
- el reporte desde la **vista `reporte_publico`** (nunca la tabla `reporte`;
  la vista ya redondea coordenadas y trae `confirmaciones`),
- la bitácora desde `evento_reporte` (`tipo_evento`, `estatus_anterior`,
  `estatus_nuevo`, `nota`, `origen`, `creado_en`) ordenada por fecha
  ascendente. **No devuelvas `autor_id`.**
- las fotos de `foto` con `aprobada = true` (ruta pública del bucket
  `fotos-reportes`; construye la URL con `supabase.storage.from(...).getPublicUrl`),
- el conteo de confirmaciones de tipo `resuelto` con identificadores
  distintos (consulta a `confirmacion`).

La página muestra, en este orden y cabiendo en una pantalla de teléfono:
1. Folio grande, emoji + etiqueta del tipo, chip de estatus con el color de
   `CATALOGO_ESTATUS` y **debajo, siempre, la fuente**: «Estatus según:
   {ETIQUETA_ORIGEN[origen_estatus]}». Si `es_ejemplo`, una franja amarilla
   «Reporte de ejemplo para la demostración».
2. Contador honesto: «Reportado hace N días · sin atención confirmada» cuando
   el estatus es `recibido`/`validado`/`en_cola`/`reabierto`; si está
   `resuelto`/`cerrado`, «Cerrado hace N días». **Nunca** muestres una fecha
   estimada inventada; `fecha_estimada_comapa` solo se muestra si no es null,
   etiquetada «Fecha comprometida por COMAPA».
3. Referencia, colonia, municipio (capitalizado), severidad, descripción.
4. Mapa chico estático: **no cargues MapLibre aquí** (la ficha debe abrir
   rápido con mala señal). Usa una imagen de MapTiler Static Maps
   (`https://api.maptiler.com/maps/streets-v2/static/{lon},{lat},16/600x300.png?key=...&markers=...`)
   con `NEXT_PUBLIC_MAPTILER_KEY`, con `alt` descriptivo. Debajo, enlace
   «Ver en el mapa grande» a `/`.
5. Fotos aprobadas (si hay), en fila horizontal desplazable.
6. Bloque de confirmaciones: «N vecinos también lo reportan» y el botón
   «Yo también» (componente cliente de la parte B). Si hay ≥ 2 confirmaciones
   `resuelto`, mostrar «La comunidad indica que ya fue reparado (N personas)».
7. Bitácora: lista vertical con fecha legible (día/mes/año, hora), texto
   humano del evento («Reporte recibido», «Cambio de estatus: X → Y»,
   «Vecino confirmó»), nota si existe y etiqueta del origen.
8. Pie: el deslinde que ya usa `src/app/page.tsx` (extráelo a
   `src/components/PieDeslinde.tsx` y úsalo en ambas páginas).

Genera `metadata` dinámica con `generateMetadata` (título «OJO-2026-0001 ·
Ojo de Agua»). No se necesita caché especial: usa `export const dynamic =
"force-dynamic"` para que siempre lea la base.

## B. Botón «Yo también» — confirmaciones

**Ruta:** `src/app/api/reportes/[id]/confirmar/route.ts`, `POST`. Cuerpo JSON:
`{ token: string, tipo: "afectado" | "resuelto", comentario?: string }`.

Reglas, en el servidor:
- `id` debe ser UUID; el reporte debe existir y ser `visible = true`; si su
  estatus es `rechazado` o `duplicado` responde 409 «Este reporte no admite
  confirmaciones».
- `token` obligatorio (string de 10–100 caracteres). El identificador que se
  guarda es `sha256(token)` en hexadecimal (usa `crypto.subtle` o
  `node:crypto`; mira cómo lo hace ya `src/app/api/reportes/route.ts` y
  reutiliza esa función moviéndola a `src/lib/hash.ts` si está inline).
- `comentario` opcional, recorta a 200 caracteres, sin HTML.
- Límite de tasa: reutiliza la tabla `intento` con el mismo criterio que la
  creación (3 cada 10 min por hash/IP). Si el helper de tasa está inline en
  `route.ts`, muévelo a `src/lib/limiteTasa.ts` y úsalo desde ambas rutas
  sin cambiar su comportamiento.
- Inserta en `confirmacion`. Si choca con la unicidad
  `(reporte_id, identificador, tipo)` responde 200 con `{ ok: true,
  repetida: true }` — el usuario ya había confirmado; no es error.
- Inserta un `evento_reporte` con `tipo_evento = 'confirmacion_afectado'` o
  `'confirmacion_resuelto'`, `origen = 'comunidad'`, sin cambio de estatus.
- Responde `{ ok: true, confirmaciones: N }` con el nuevo total de `afectado`
  (léelo de `reporte_publico`).
- **No** cambies el estatus del reporte automáticamente aunque haya ≥ 2
  `resuelto`; eso queda para el moderador. Solo se muestra en la ficha.

**Componente cliente:** `src/components/reporte/BotonYoTambien.tsx`. Recibe
`reporteId`, `confirmacionesIniciales`, `estatus`. Dos botones grandes
(`min-h-12`): «Yo también me afecta» y «Ya la arreglaron». Al pulsar: obtiene
el token con `obtenerTokenDispositivo()`, hace `fetch` al endpoint, muestra
estado de carga, y al terminar actualiza el contador y deshabilita el botón
pulsado con texto «Gracias, ya contamos tu confirmación». Guarda en
`localStorage` (`ojo_confirmados`, lista de `reporteId:tipo`) para que al
recargar aparezca ya deshabilitado. Errores en una línea en español, sin
`alert()`.

**Mapa:** en `src/components/Mapa.tsx`, el popup debe incluir un enlace
«Ver ficha» a `/reporte/{folio}`. Cambio mínimo; no reestructures el
componente ni toques la lógica del `ref` de reportes (ver CLAUDE.md §9).

## C. Consulta por folio

- `src/app/seguir/page.tsx` (cliente): un campo de texto grande con
  `inputMode="text"`, `autoCapitalize="characters"`, placeholder
  `OJO-2026-0001`, y botón «Buscar». Al enviar, normaliza (mayúsculas,
  quitar espacios; si el usuario escribe solo «142», conviértelo a
  `OJO-{año actual}-0142`) y navega con `router.push('/reporte/' + folio)`.
- Debajo, «Tus reportes recientes en este teléfono»: lista de
  `leerFoliosRecientes()` como enlaces a su ficha. Si está vacía, un texto
  breve.
- Enlace «Seguir un reporte» en la barra superior de `src/app/page.tsx` junto
  al de «Reportar», y en `src/components/reportar/Confirmacion.tsx` cambia
  «Ver en el mapa» por dos enlaces: «Ver mi reporte» (`/reporte/{folio}`) y
  «Ver en el mapa».

## D. Datos de ejemplo en la base — `db/semilla.sql`

Escribe un script SQL **idempotente** que inserte en `reporte` los 16
reportes de `src/lib/datosEjemplo.ts` con `es_ejemplo = true`, `visible =
true`, `hash_reportante = 'semilla'`, `creado_en = now() - interval 'N days'`
según el campo `dias`, `ubicacion = ST_SetSRID(ST_MakePoint(lon, lat),
4326)::geography`, más `latitud`/`longitud`, y para cada uno un
`evento_reporte` de tipo `'creado'` con origen `'ciudadano'` y, si el estatus
no es `recibido`, un segundo evento de cambio de estatus con el `origen`
correspondiente. Idempotencia: borra antes todo lo que tenga
`hash_reportante = 'semilla'` (eventos, confirmaciones y fotos incluidos, en
ese orden por las llaves foráneas) y vuelve a insertar. El folio lo genera el
trigger: **no lo fijes a mano**. Agrega 2–3 confirmaciones `afectado` con
identificadores `semilla-1`, `semilla-2`… a algunos reportes. Añade al
`README.md` una sección corta «Datos de ejemplo» explicando cómo correrlo en
el editor SQL de Supabase. **No lo ejecutes tú**; Claude lo aplicará por MCP.

Revisa en `db/schema.sql` los nombres exactos de columnas de `reporte` antes
de escribir el script; no inventes columnas.

## Entrega

1. `npm run build` (con `--webpack` si Turbopack no corre en tu sandbox) y
   `npm run lint` sin errores ni warnings nuevos.
2. Lista **cada archivo** creado o modificado.
3. Cualquier desviación de este documento, dicha explícitamente. No reportes
   como hecho nada que no esté en el sistema de archivos.
