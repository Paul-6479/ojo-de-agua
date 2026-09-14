# Instrucción para Codex — Semana 1: cimientos de Ojo de Agua

> Este archivo es la instrucción completa que se le entrega a Codex. Es
> autocontenida: no necesitas nada más que este texto, `AGENTS.md` y `CLAUDE.md`.
> Léelos los tres antes de escribir una sola línea.

## Contexto en tres párrafos

Ojo de Agua es una plataforma web ciudadana para reportar fugas y problemas de
agua en la zona conurbada Tampico – Ciudad Madero – Altamira (Tamaulipas,
México). La gente reporta desde el teléfono sin crear cuenta y todo el mundo ve
un mapa público con los reportes, su estatus y su historial. Es un proyecto
académico individual; se califica lo que se ve y se demuestra, no la
robustez interna.

El proyecto ya está inicializado en este directorio: Next.js 16.3.5 (App
Router, TypeScript, carpeta `src/`, alias `@/*`), React 19, Tailwind CSS 4,
ESLint. `maplibre-gl` y `@supabase/supabase-js` ya están instalados. Solo
existe la plantilla por defecto (`src/app/layout.tsx`, `src/app/page.tsx`,
`src/app/globals.css`). `README.md`, `AGENTS.md`, `CLAUDE.md` y
`.env.local.example` ya existen y **no se tocan** salvo donde se indique.

El autor está aprendiendo React y Next.js leyendo este código. Escríbelo para
que lo entienda alguien que sabe JavaScript pero nunca ha visto React:
componentes chicos, nombres obvios, sin abstracciones ingeniosas. Todo en
español de México: interfaz, comentarios, nombres de dominio.

## Reglas inamovibles

1. **No cambies el stack ni instales dependencias.** Nada de Leaflet, Mapbox,
   Google Maps, Prisma, Drizzle, zod, react-map-gl, shadcn, ni librerías de
   estado. Todo se resuelve con Next, React, Tailwind, `maplibre-gl` y
   `@supabase/supabase-js`. Si crees que falta algo, no lo instales: dilo en el
   reporte final.
2. **Next.js 16 no es el Next que conoces.** Antes de escribir rutas, páginas o
   layouts, lee `node_modules/next/dist/docs/01-app/01-getting-started/`
   (en especial `03-layouts-and-pages.md`, `05-server-and-client-components.md`,
   `15-route-handlers.md`). Puntos ya verificados:
   - `params` y `searchParams` son promesas (`await`).
   - Los tipos de props de páginas y layouts son los helpers globales
     `PageProps<"/ruta">` y `LayoutProps<"/">`, sin importar nada. Ya se usa en
     `src/app/layout.tsx`; imítalo.
   - `middleware.ts` no existe; se llama `proxy.ts` (no lo necesitas esta semana).
3. **Seguridad de datos.** La clave `service_role` solo se usa en código de
   servidor. El navegador solo lee la vista `reporte_publico`, nunca la tabla
   `reporte`. Nunca escribas credenciales reales en ningún archivo.
4. **Mobile-first.** Cada pantalla se diseña primero para teléfono con una
   mano y sol directo (contraste alto, botones grandes).
5. **No hagas commits.** Deja los cambios en el árbol de trabajo; Claude los
   revisa con `git diff` y decide.

## Entregables (exactamente estos ocho archivos)

### 1. `db/schema.sql`

Esquema completo de PostgreSQL para Supabase, **comentado en español** (es
entregable de la materia; los comentarios explican el *porqué* de cada
decisión). Debe ser idempotente en lo razonable (`create extension if not
exists`, `create type ... ` protegido con `do $$ ... $$` o `drop type if
exists` al inicio, `create table if not exists`, `create or replace
function/view`) para poder re-ejecutarlo en el editor SQL de Supabase.

Contenido, en este orden:

- `create extension if not exists postgis;`
- **Enumerados:**
  - `tipo_problema`: `fuga_calle`, `fuga_domicilio`, `sin_agua`, `baja_presion`,
    `agua_sucia`, `drenaje`, `alcantarilla`, `hidrante`, `otro`.
  - `severidad`: `baja`, `media`, `alta`.
  - `estatus_reporte`: `recibido`, `validado`, `en_cola`, `en_proceso`,
    `resuelto`, `cerrado`, `duplicado`, `rechazado`, `reabierto`, `derivado`.
  - `origen_estatus`: `ciudadano`, `comunidad`, `moderador`, `comapa`,
    `sistema`.
  - `tipo_confirmacion`: `afectado`, `resuelto`.
  - `rol_usuario`: `ciudadano`, `moderador`, `operador`, `admin`.
  - `municipio_nombre`: `tampico`, `madero`, `altamira`.
- **Tabla `municipio`:** `id`, `nombre municipio_nombre unique`, `poligono
  geography(MultiPolygon,4326)`. Inserta los tres municipios con un polígono
  **aproximado** (un rectángulo o hexágono por municipio, con comentario que
  diga que es aproximado y se sustituirá por el del Marco Geoestadístico de
  INEGI). Coordenadas de referencia: Tampico ~22.25 N, −97.87 O; Madero ~22.27
  N, −97.83 O; Altamira ~22.39 N, −97.93 O.
- **Tabla `usuario`:** `id uuid primary key references auth.users(id) on delete
  cascade`, `rol rol_usuario not null default 'ciudadano'`, `reputacion int
  default 0`, `colonias_interes text[]`, `creado_en timestamptz default now()`.
- **Tabla `reporte`** con estas columnas: `id uuid pk default gen_random_uuid()`,
  `folio text unique not null` (lo llena un trigger, ver abajo), `tipo
  tipo_problema not null`, `severidad severidad not null default 'media'`,
  `descripcion text` (máx 500, `check`), `ubicacion geography(Point,4326) not
  null`, `latitud double precision not null`, `longitud double precision not
  null`, `precision_gps_m real`, `pin_movido boolean default false`,
  `referencia text` (calle/esquina), `colonia text` (texto libre normalizado),
  `municipio municipio_nombre`, `estatus estatus_reporte not null default
  'recibido'`, `origen_estatus origen_estatus not null default 'ciudadano'`,
  `fecha_estimada_comapa date`, `estimacion_estadistica interval`,
  `dias_sin_atencion int`, `reporte_padre_id uuid references reporte(id)`,
  `hash_reportante text`, `visible boolean not null default true`, `es_ejemplo
  boolean not null default false` (marca los datos semilla de la demo),
  `creado_en timestamptz not null default now()`, `cerrado_en timestamptz`.
  - **Folio:** formato `OJO-2026-0142`. Crea una secuencia `folio_seq` y una
    función/trigger `before insert` que arme `'OJO-' || año actual || '-' ||
    lpad(nextval, 4, '0')`. Comenta por qué lo genera Postgres y no la app
    (dos inserciones simultáneas chocarían).
  - **Latitud/longitud → ubicación:** un trigger `before insert or update`
    que llene `ubicacion` a partir de `latitud`/`longitud` si viene nula, para
    que las rutas de la app solo manden números.
  - Índices: `gist(ubicacion)`, `btree(estatus)`, `btree(creado_en desc)`,
    `btree(reporte_padre_id)`.
- **Tabla `evento_reporte`:** `id bigserial`, `reporte_id`, `tipo_evento text`,
  `estatus_anterior estatus_reporte`, `estatus_nuevo estatus_reporte`,
  `autor_id uuid` (nulo si anónimo), `rol rol_usuario`, `nota text`, `origen
  origen_estatus not null`, `creado_en timestamptz default now()`. Comentario:
  bitácora inmutable, nunca se actualiza ni borra. Índice por `reporte_id`.
- **Tabla `foto`:** `id`, `reporte_id`, `ruta_storage text`, `ruta_miniatura
  text`, `momento text check (momento in ('antes','despues'))`, `aprobada
  boolean default false`, `creado_en`.
- **Tabla `confirmacion`:** `id`, `reporte_id`, `identificador text not null`
  (hash del dispositivo o id de usuario), `tipo tipo_confirmacion not null`,
  `comentario text` (máx 200), `creado_en`. `unique (reporte_id,
  identificador, tipo)`.
- **Tabla `intento`:** `id bigserial`, `hash_dispositivo text`, `ip inet`,
  `creado_en timestamptz default now()`. Índice por `creado_en`. Comentario:
  Vercel no tiene memoria entre peticiones, por eso el límite de tasa se
  cuenta aquí.
- **Tabla `tasa_fuga`:** `tipo tipo_problema`, `severidad severidad`,
  `litros_por_hora numeric`, pk compuesta. Inserta valores plausibles solo para
  los tipos que pierden agua (`fuga_calle`, `fuga_domicilio`, `hidrante`), con
  comentario de que son supuestos ajustables.
- **Tabla `aviso`:** `id`, `titulo`, `cuerpo`, `zona geography(MultiPolygon,4326)`,
  `municipio municipio_nombre`, `vigente_desde timestamptz`, `vigente_hasta
  timestamptz`, `fuente text`, `creado_en`.
- **Vista `reporte_publico`:** expone solo: `id`, `folio`, `tipo`, `severidad`,
  `descripcion`, `latitud` y `longitud` **redondeadas a 4 decimales** (~11 m;
  comenta que la promesa de privacidad se cumple aquí, no en el código),
  `referencia`, `colonia`, `municipio`, `estatus`, `origen_estatus`,
  `fecha_estimada_comapa`, `estimacion_estadistica`, `dias_sin_atencion`,
  `reporte_padre_id`, `es_ejemplo`, `creado_en`, `cerrado_en`, y
  `confirmaciones int` calculado como el conteo de confirmaciones tipo
  `afectado` del reporte **más las de sus hijos** (`reporte_padre_id = id`).
  Filtra `visible = true`. **No** expone `ubicacion`, `precision_gps_m`,
  `pin_movido` ni `hash_reportante`. Créala con `security_invoker = false`
  (por defecto) y explícalo: la vista lee la tabla base aunque `anon` no
  tenga acceso a ella.
- **Función `reportes_cercanos(lat double precision, lon double precision,
  radio_metros int default 75, dias int default 30)`** que devuelve filas de
  `reporte_publico` más `distancia_m`, para reportes con estatus abierto (no
  `resuelto`, `cerrado`, `rechazado`, `duplicado`) creados en los últimos
  `dias` días, dentro de `radio_metros` usando `ST_DWithin` sobre la tabla
  base. `security definer`, `stable`, y `grant execute` a `anon`.
- **RLS:** `alter table ... enable row level security` en **todas** las tablas.
  **Ninguna política para `anon`** en ninguna tabla. `revoke all on all tables
  in schema public from anon; grant select on reporte_publico to anon; grant
  select on aviso to anon;` (más una política de lectura en `aviso` para
  `anon` de avisos vigentes). Comenta explícitamente que toda escritura pasa
  por el servidor con `service_role`, que ignora RLS.

### 2. `src/lib/supabase.ts`

Dos funciones, con comentarios:

- `crearClientePublico()` — usa `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Se puede importar desde cualquier lado.
- `crearClienteServidor()` — usa `SUPABASE_SERVICE_ROLE_KEY`. No uses el
  paquete `server-only` (no está instalado); en su lugar la función lanza un
  error claro si `typeof window !== "undefined"`. Comenta que solo se importa
  desde `src/app/api/**`.

Ambas lanzan un error con mensaje en español si falta la variable de entorno,
señalando `.env.local.example`.

### 3. `src/lib/tipos.ts`

Tipos TypeScript espejo del esquema: uniones de literales para cada enumerado
(`TipoProblema`, `Severidad`, `EstatusReporte`, `OrigenEstatus`, `Municipio`),
interfaz `ReportePublico` (exactamente las columnas de la vista) y una interfaz
`ReporteGeoJSON` para las features del mapa. Además dos catálogos exportados
que usará la interfaz:

- `CATALOGO_TIPOS: Record<TipoProblema, { etiqueta: string; emoji: string }>`
  con etiquetas en español (ej. `fuga_calle` → "Fuga en la calle", 💧).
- `CATALOGO_ESTATUS: Record<EstatusReporte, { etiqueta: string; color: string }>`
  con colores hex de una paleta clara sobre mapa: abiertos en rojo/naranja
  (`recibido` #e11d48, `validado` #f97316, `en_cola` #f59e0b, `en_proceso`
  #2563eb, `reabierto` #be123c), cerrados en verde/gris (`resuelto` #16a34a,
  `cerrado` #64748b), laterales en gris (`duplicado`, `rechazado`, `derivado`
  #94a3b8).
- `ETIQUETA_ORIGEN: Record<OrigenEstatus, string>` (ej. `comunidad` →
  "según vecinos", `comapa` → "según COMAPA").

### 4. `src/lib/datosEjemplo.ts`

Exporta `REPORTES_EJEMPLO: ReportePublico[]` con **16 reportes** en colonias
reales de la conurbación, con coordenadas plausibles dentro de la mancha
urbana (no en el mar ni en la laguna). Distribución sugerida: 8 en Tampico
(Centro, Guadalupe, Petrolera, Del Bosque, Lomas de Rosales, Águila,
Arenal, Morelos), 5 en Ciudad Madero (Centro, Unidad Nacional, Miramar,
Árbol Grande, Primero de Mayo), 3 en Altamira (Centro, Miramar sector
norte, Laguna de la Puerta). Variedad de tipos y estatus; `es_ejemplo: true`
en todos; `creado_en` entre 1 y 45 días atrás calculados desde `new Date()`
para que los "días transcurridos" del popup se vean realistas; `folio`
`OJO-2026-0001` … `0016`; `origen_estatus` coherente con el estatus
(`recibido` → `ciudadano`, `resuelto` → `comunidad`, etc.); descripciones
cortas y creíbles en español coloquial de Tamaulipas.

También exporta `reportesAGeoJSON(reportes: ReportePublico[]):
GeoJSON.FeatureCollection` que convierte la lista al formato que consume
MapLibre (`properties` = todo el reporte, `geometry.coordinates =
[longitud, latitud]`).

### 5. `src/components/Mapa.tsx`

Componente de cliente (`"use client"`) que recibe `reportes: ReportePublico[]`
y `alSeleccionar?: (reporte: ReportePublico) => void`. Requisitos:

- MapLibre GL con estilo de MapTiler (`streets-v2` o similar) usando
  `NEXT_PUBLIC_MAPTILER_KEY`. Si la clave está vacía, usa como respaldo el
  estilo demo de MapLibre (`https://demotiles.maplibre.org/style.json`) y
  muestra un aviso discreto de "falta la clave de MapTiler" en pantalla, para
  que la página no truene sin configuración.
- Importa `maplibre-gl/dist/maplibre-gl.css`.
- Centro `[-97.8686, 22.2553]`, zoom 12, con `maxBounds` holgado alrededor de
  la conurbación.
- Fuente GeoJSON con `cluster: true`, `clusterRadius: 50`. Tres capas:
  círculos de clúster (tamaño por conteo), etiqueta con el número, y puntos
  individuales con color según estatus usando una expresión `match` sobre
  `estatus` y los colores de `CATALOGO_ESTATUS`. Clic en clúster → acercar.
- Clic en un punto → popup de MapLibre con: folio, etiqueta del tipo con emoji,
  estatus con su color y la etiqueta de origen ("según vecinos"), "hace N
  días", colonia y municipio, y la marca "Ejemplo" si `es_ejemplo`. Cursor
  tipo mano al pasar sobre puntos.
- Control de navegación y de pantalla completa, y un botón de geolocalización
  (`GeolocateControl`).
- Cuando cambie la prop `reportes`, actualiza los datos de la fuente con
  `setData` sin recrear el mapa.
- Limpia el mapa en el `return` del `useEffect`.
- El contenedor ocupa el 100 % del alto que le da el padre.
- Comenta brevemente qué hace `useRef` y por qué el mapa se crea dentro de
  `useEffect` (React no conoce a MapLibre; el mapa vive fuera del árbol de
  React).

### 6. `src/app/page.tsx`

Página de inicio. Por ahora **usa `REPORTES_EJEMPLO` directamente**, sin
Supabase (la conexión real llega en la semana 2). Estructura:

- **Barra superior** fija: nombre "Ojo de Agua" con un ícono simple (puede ser
  un emoji 💧 o un SVG inline), descriptor "Reporte ciudadano del agua · Zona
  conurbada de Tampico", y un botón primario "Reportar" que por ahora enlaza
  a `/reportar` (ruta que aún no existe; está bien).
- **Filtros** (componente `src/components/Filtros.tsx`, cliente): chips
  horizontales con scroll para estatus ("Todos", "Abiertos", "Resueltos") y
  para tipo (los del catálogo con emoji). Filtran la lista en memoria y se
  la pasan al mapa. Deben caber cómodamente en un teléfono.
- **Mapa** a pantalla completa debajo de la barra.
- **Contador** pequeño flotante: "N reportes · datos de ejemplo".
- **Pie** con el deslinde exacto: "Proyecto ciudadano independiente. No es un
  canal oficial de COMAPA ni de ningún organismo público." y un enlace a
  "Aviso de privacidad" (`/privacidad`, aún no existe).

Paleta de azules con Tailwind (fondos `sky`/`blue`, texto oscuro, contraste
alto). Como el mapa y los filtros necesitan estado, `page.tsx` puede ser un
componente de cliente completo o delegar en un componente `Inicio.tsx`; elige
lo más simple y explícalo en un comentario.

### 7. `src/app/globals.css`

Ajusta solo lo necesario (tipografía y colores base). No borres las
directivas de Tailwind 4.

### 8. `README.md`

Ya existe y está bien. Solo actualiza la sección **Estado del proyecto** para
reflejar lo entregado y la sección **Estructura** si agregaste
`src/components/Filtros.tsx` u otro archivo. No reescribas el resto.

## Verificación obligatoria antes de reportar

1. `npm run build` compila sin errores ni warnings nuevos.
2. `npm run lint` pasa.
3. `find src db -type f` muestra todos los archivos prometidos.
4. Con `.env.local` **ausente**, `npm run dev` y abrir `http://localhost:3000`
   muestra el mapa (con el estilo de respaldo y el aviso de que falta la
   clave) y los 16 puntos de ejemplo; los filtros funcionan; el popup abre.

## Formato del reporte final

Lista **cada archivo creado o modificado** con una línea de qué contiene,
cualquier desviación respecto a esta instrucción y por qué, y cualquier
cosa que no pudiste completar. No reportes como hecho nada que no esté en
disco. No hagas commit.
