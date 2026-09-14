# Ojo de Agua

**Reporte ciudadano del agua · Zona conurbada de Tampico**

Plataforma web para que cualquier persona reporte fugas y problemas de agua en
Tampico, Ciudad Madero y Altamira (Tamaulipas) desde el teléfono, **sin crear
cuenta**, y para que todos vean en un mapa público qué se ha reportado, en qué
estado está y desde cuándo.

> ⚠️ **Deslinde.** Este es un proyecto ciudadano independiente, desarrollado
> como proyecto académico. **No es un canal oficial de COMAPA** ni de ningún
> organismo público. Para emergencias, usa los canales oficiales.

## ¿Por qué existe?

Hoy una fuga se reporta por teléfono o en Facebook y desaparece: nadie sabe si
ya la vieron, si la van a atender ni cuánta gente más está afectada. Ojo de
Agua convierte cada reporte en un punto público en el mapa con historial
visible, y agrupa los reportes repetidos como señal de cuánta gente afecta.

En México un *ojo de agua* es un manantial; "ojo" también es vigilancia.

## Estado del proyecto

🟡 **En construcción (semana 3 de 8).** Ya están el esquema PostGIS con RLS,
el mapa público, el flujo móvil para crear reportes, la ficha pública por
folio con historial y las confirmaciones de vecinos. Demo en producción:
<https://ojo-de-agua-ruby.vercel.app>. Ver el plan completo en
[`CLAUDE.md`](./CLAUDE.md).

## Reportar un problema

Desde el botón **Reportar**, el flujo guía a la persona en tres pantallas: fija
la ubicación con GPS y un pin arrastrable, elige el tipo y severidad del
problema, y puede adjuntar hasta tres fotos. Las fotos se recomprimen en el
teléfono para quitar metadatos EXIF, incluidas posibles coordenadas GPS. Al
final recibe un folio persistente en su navegador.

El formulario usa tres capas antispam sin pedir cuenta: un campo oculto para
bots (honeypot), límite de tres intentos por IP o dispositivo cada diez minutos,
y revisión automática de que el punto pertenezca a Tampico, Ciudad Madero o
Altamira. Los reportes fuera de esa zona se guardan para la bitácora, pero no
se publican.

## Seguir un reporte

Cada reporte tiene una ficha pública en `/reporte/<folio>` (por ejemplo
`/reporte/OJO-2026-0006`) con su tipo, estatus, referencia, un mapa chico,
las fotos aprobadas y el historial completo de movimientos. La ficha siempre
dice **de dónde sale el estatus** («según quien reportó», «según vecinos»,
«según COMAPA») y, mientras nadie lo atiende, muestra «Reportado hace N días ·
sin atención confirmada» en lugar de inventar una fecha de resolución.

En `/seguir` se busca cualquier folio (basta escribir el número) y aparecen
los reportes hechos desde ese mismo teléfono.

Dos botones permiten a los vecinos sumar información sin cuenta: **«Yo también
me afecta»** (cuenta cuánta gente sufre el mismo problema y sirve para
priorizar) y **«Ya la arreglaron»**. Cuando dos personas distintas marcan lo
segundo, la ficha lo señala como cierre comunitario; el estatus oficial no
cambia solo, eso queda para moderación. Cada confirmación se registra en el
historial y respeta el mismo límite de tasa que la creación de reportes.

## Rutas de API

Todas responden JSON con `{ ok: true, ... }` o `{ ok: false, error }`. Las
escrituras se validan en el servidor y usan la clave `service_role`; el
navegador nunca escribe directo en Supabase.

| Método y ruta | Qué hace |
|---|---|
| `GET /api/reportes` | GeoJSON de los reportes visibles (vista `reporte_publico`), caché 30–60 s |
| `GET /api/reportes/cercanos?lat&lon` | Reportes abiertos a menos de 75 m en 30 días, para avisar de duplicados |
| `POST /api/reportes` | Crea un reporte. Honeypot, límite de tasa y límite geográfico |
| `POST /api/reportes/[id]/foto` | Registra una foto ya subida; solo con el token del creador |
| `POST /api/reportes/[id]/confirmar` | Cuerpo `{ token, tipo: "afectado" \| "resuelto" }`. Repetir devuelve `repetida: true` |

## Stack

| Capa | Tecnología | Nota |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | Ver `AGENTS.md`: esta versión tiene cambios respecto a la documentación común |
| Estilos | Tailwind CSS 4 | |
| Datos, auth y fotos | Supabase (PostgreSQL + PostGIS) | Tier gratuito |
| Mapa | MapLibre GL JS + teselas de MapTiler | Sin Google Maps ni Mapbox: cobran por carga |
| Hosting | Vercel | |

## Instalación

Requisitos: Node.js 20 o superior y npm.

```bash
git clone <url-del-repositorio>
cd ojo-de-agua
npm install
cp .env.local.example .env.local   # y llena las variables (ver abajo)
npm run dev
```

Abre <http://localhost:3000>.

### Variables de entorno

Se definen en `.env.local` (nunca se sube al repositorio). El archivo
`.env.local.example` documenta cada una:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → clave `anon` |
| `NEXT_PUBLIC_MAPTILER_KEY` | maptiler.com → Account → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → clave `service_role` |

Las tres con prefijo `NEXT_PUBLIC_` se envían al navegador; la clave `anon` solo
puede leer la vista pública gracias a RLS. La `service_role` **solo la usa el
servidor** (rutas de Next.js) y por eso no lleva prefijo: nunca la pongas en un
componente ni la subas al repositorio.

### Aplicar el esquema en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (no pide tarjeta).
2. Abre **SQL Editor** → **New query**.
3. Pega el contenido de `db/schema.sql` y ejecútalo. El archivo activa PostGIS,
   crea las tablas, índices, la función `reportes_cercanos` y las políticas RLS.
4. Verifica en **Table Editor** que aparezcan las tablas `reporte`,
   `evento_reporte`, `foto` y `confirmacion`.

> Los proyectos gratuitos de Supabase se **pausan tras ~1 semana sin uso**. Si
> el mapa aparece vacío o da error de conexión, entra al panel de Supabase y
> reactívalo con un clic.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción (correr antes de subir) |
| `npm run start` | Sirve la compilación de producción |
| `npm run lint` | Revisa el código con ESLint |

## Estructura

```
db/schema.sql                Esquema de la base de datos, comentado en español
db/semilla.sql               Reportes de ejemplo para cargar en Supabase
docs/codex/                  Instrucciones de cada tanda delegada a Codex
src/app/page.tsx             Portada con el mapa
src/app/reportar/            Flujo de tres pasos para crear un reporte
src/app/reporte/[folio]/     Ficha pública de un reporte
src/app/seguir/              Consulta por folio
src/app/api/reportes/        Rutas de servidor (ver «Rutas de API»)
src/components/Mapa.tsx      Mapa MapLibre con agrupamiento de reportes
src/components/Filtros.tsx   Chips para filtrar el mapa en memoria
src/components/reportar/     Pantallas del flujo de reporte
src/components/reporte/      Piezas de la ficha: botón «yo también», historial, mini-mapa
src/lib/supabase.ts          Clientes de Supabase (público y de servidor)
src/lib/consultas.ts         Lectura de una ficha completa desde el servidor
src/lib/validarReporte.ts    Validación de un reporte nuevo en el servidor
src/lib/limiteTasa.ts        Límite de intentos por dispositivo e IP
src/lib/hash.ts              SHA-256 del token del dispositivo
src/lib/dispositivo.ts       Token anónimo y folios recientes en localStorage
src/lib/tipos.ts             Tipos TypeScript espejo del esquema
src/lib/datosEjemplo.ts      Reportes de ejemplo para la demo (marcados como tales)
```

## Principios de diseño

- **Reportar toma menos de 60 segundos y no exige cuenta.** No se pide CURP,
  INE ni teléfono obligatorio.
- **Honestidad sobre el estatus.** La interfaz siempre indica de dónde sale cada
  estado (ciudadano, moderador, COMAPA). No se inventan tiempos de resolución.
- **Privacidad.** Las fotos se suben sin metadatos EXIF; la ubicación pública se
  redondea; nunca se muestra nombre ni domicilio del reportante.
- **Móvil primero.** Se usa parado en la banqueta, con sol y mala señal.

## Despliegue

El proyecto está en Vercel (plan Hobby) conectado a este repositorio: **cada
`git push` a `main` despliega producción** en
<https://ojo-de-agua-ruby.vercel.app>. Las mismas cuatro variables de entorno
van en *Settings → Environment Variables*.

Dos cosas que aprendimos a la mala:

- Vercel Hobby bloquea el despliegue (`COMMIT_AUTHOR_REQUIRED`) si el autor
  del commit no es una cuenta de GitHub vinculada a la de Vercel. Configura
  `git config --global user.email` con tu correo de GitHub.
- *Deployment Protection* viene activada y manda al login de Vercel; para un
  sitio público hay que apagarla en *Settings → Deployment Protection*.

## Licencia y contacto

Proyecto académico individual. Para solicitar el retiro de una foto o reportar
un problema con el sitio, abre un *issue* en este repositorio.

## Límites municipales

`src/lib/municipios.json` contiene los polígonos de Tampico, Ciudad Madero y
Altamira tomados de OpenStreetMap (relaciones `admin_level=6`, licencia ODbL,
simplificados a ~40 m). Se usan para dibujar los contornos en el mapa y, en
`db/schema.sql`, para que la tabla `municipio` tenga los límites reales con los
que se decide si un reporte cae dentro de la zona conurbada. Para regenerarlos
basta con volver a consultar Overpass y reemplazar el archivo.

## Datos de ejemplo

Para que el mapa no se vea vacío en la demostración, `db/semilla.sql` carga
16 reportes de ejemplo (marcados con `es_ejemplo = true`, la interfaz los
etiqueta así) con su bitácora y algunas confirmaciones. Se ejecuta en el
**editor SQL de Supabase** después de aplicar `db/schema.sql`. Es idempotente:
correrlo otra vez borra los de ejemplo anteriores y los vuelve a crear.
