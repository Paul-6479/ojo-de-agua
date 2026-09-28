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

🟢 **Las 8 semanas del plan están construidas y desplegadas.** Mapa público,
flujo de reporte móvil sin cuenta, ficha por folio con bitácora, confirmaciones
de vecinos, panel de operador (fase B simulada), portada con métricas de impacto,
avisos de corte y tandeo, PWA con cola offline y tarea diaria de mantenimiento.

Demo en producción: <https://ojo-de-agua-ruby.vercel.app>

Lo que queda es trabajo de campo, no de código: fotografiar y cargar 30–50
problemas reales, probar en un teléfono en la calle y ensayar la presentación.
El plan completo y el estado detallado están en [`CLAUDE.md`](./CLAUDE.md).

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

## Rutas y API

### Públicas

| Ruta | Qué es |
|---|---|
| `/` | Portada de impacto: cifras estimadas, mapa con clustering, ranking de colonias y banner de avisos vigentes |
| `/reportar` | Flujo de reporte en tres pasos, sin cuenta, con cola offline |
| `/reporte/[folio]` | Ficha pública con bitácora, fotos aprobadas y botones de confirmación |
| `/seguir` | Buscar un reporte por folio |
| `/avisos` | Cortes, tandeo y avisos vigentes |
| `/privacidad` | Aviso de privacidad |
| `/offline` | Página de respaldo del service worker |

### Panel de personal (requiere cuenta con rol)

| Ruta | Qué es |
|---|---|
| `/panel/entrar` | Acceso con correo y contraseña (Supabase Auth) |
| `/panel` | Bandeja de trabajo con filtros por estatus y municipio |
| `/panel/reporte/[folio]` | Ficha interna: cambio de estatus, fecha comprometida, moderación de fotos, cierre con evidencia |
| `/panel/avisos` | Publicar y retirar avisos de corte y tandeo |

### API

| Ruta | Método | Notas |
|---|---|---|
| `/api/reportes` | GET | GeoJSON del mapa, caché 30–60 s |
| `/api/reportes` | POST | Crea un reporte: honeypot, límite de tasa, límite geográfico |
| `/api/reportes/cercanos` | GET | Posibles duplicados antes de crear |
| `/api/reportes/[id]/confirmar` | POST | «Yo también» / «ya la arreglaron» |
| `/api/reportes/[id]/foto` | POST | Foto del reportante, con su token |
| `/api/estadisticas` | GET | Cifras de la portada, caché 60–300 s |
| `/api/avisos` | GET | Avisos vigentes |
| `/api/panel/sesion` | POST, DELETE | Entrar y salir |
| `/api/panel/estatus` | POST | Cambio de estatus con nota |
| `/api/panel/fecha-estimada` | POST | Solo operador o admin |
| `/api/panel/foto` | POST, PATCH | Subir evidencia / aprobar u ocultar |
| `/api/panel/aviso` | POST, PATCH | Publicar / retirar aviso |

Todas las escrituras se validan en el servidor y usan `SUPABASE_SERVICE_ROLE_KEY`;
el navegador nunca escribe en Supabase. Las rutas de `/api/panel/**` verifican la
sesión de Supabase Auth y el rol en la tabla `usuario`.

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

## Base de datos

`db/schema.sql` es el esquema completo. Sobre una base que ya existe, aplicar en
orden los archivos de `db/migraciones/` — ver **`docs/migraciones.md`**, que dice
cuál falta y qué se degrada sin ella.

Datos de demostración: `db/semilla.sql` (reportes) y `db/semilla-avisos.sql`
(avisos, con fechas relativas a `now()`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción (correr antes de subir) |
| `npm run start` | Sirve la compilación de producción |
| `npm run lint` | Revisa el código con ESLint |

## Estructura

```
db/schema.sql                 Esquema completo, comentado en español
db/migraciones/               Cambios sobre una base que ya existe (ver docs/migraciones.md)
db/semilla.sql                Reportes de ejemplo
db/semilla-avisos.sql         Avisos de ejemplo, con fechas relativas a now()
vercel.json                   Cron de la tarea diaria de mantenimiento

src/proxy.ts                  Refresca la cookie de sesión (antes se llamaba middleware.ts)
src/app/page.tsx              Portada: métricas, mapa, ranking de colonias
src/app/reportar/             Flujo de tres pasos para crear un reporte
src/app/reporte/[folio]/      Ficha pública de un reporte
src/app/seguir/               Consulta por folio
src/app/avisos/               Cortes y tandeo vigentes
src/app/privacidad/           Aviso de privacidad
src/app/offline/              Página de respaldo del service worker
src/app/manifest.ts           Manifiesto de la PWA
src/app/panel/               Panel de personal: entrar, bandeja, ficha interna, avisos
src/app/api/                  Rutas de servidor (ver «Rutas y API»)

src/components/Mapa.tsx       Mapa MapLibre con agrupamiento y capa de zona con aviso
src/components/Filtros.tsx    Chips para filtrar el mapa en memoria
src/components/inicio/        Piezas de la portada: métricas, banner de avisos, ranking
src/components/reportar/      Pantallas del flujo de reporte
src/components/reporte/       Ficha: botón «yo también», bitácora, mini-mapa
src/components/panel/         Acciones del operador y formularios del panel
src/components/ColaOffline.tsx  Reportes en espera de señal

src/lib/supabase.ts           Clientes de Supabase (público y de servidor)
src/lib/sesion.ts             Sesión de Supabase Auth y verificación de rol
src/lib/consultas.ts          Lecturas de servidor: ficha, estadísticas, avisos
src/lib/panel.ts              Consultas de la bandeja y la ficha interna
src/lib/validarReporte.ts     Validación de un reporte nuevo en el servidor
src/lib/limiteTasa.ts         Límite de intentos por dispositivo, IP y acción
src/lib/colaOffline.ts        Cola de reportes sin señal en localStorage
src/lib/estadisticas.ts       Tipos y formato de las cifras de impacto
src/lib/avisos.ts             Tipos y textos de los avisos
src/lib/dispositivo.ts        Token anónimo y folios recientes en localStorage
src/lib/hash.ts               SHA-256 del token del dispositivo
src/lib/tipos.ts              Tipos espejo del esquema y transiciones de estatus
src/lib/datosEjemplo.ts       Reportes de respaldo para la demo
```

## Principios de diseño

- **Reportar toma menos de 60 segundos y no exige cuenta.** No se pide CURP,
  INE ni teléfono obligatorio.
- **Honestidad sobre el estatus.** La interfaz siempre indica de dónde sale cada
  estado (ciudadano, moderador, COMAPA). No se inventan tiempos de resolución.
- **Privacidad.** Las fotos se suben sin metadatos EXIF; la ubicación pública se
  redondea; nunca se muestra nombre ni domicilio del reportante.
- **Móvil primero.** Se usa parado en la banqueta, con sol y mala señal.

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

## Documentación

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Documento maestro: idea, decisiones, plan y estado |
| `AGENTS.md` | Reglas para agentes de código |
| `docs/arquitectura.md` | Cómo está armado y por qué |
| `docs/guia-del-codigo.md` | **Empieza aquí para modificar el código.** Las ideas de React/Next que se usan, el recorrido de un reporte, dónde está cada cosa y las trampas ya descubiertas |
| `docs/operacion.md` | Operar la plataforma y el panel; crear el usuario de panel |
| `docs/migraciones.md` | Qué migración falta y cómo aplicarla |
| `docs/presentacion.md` | Guion de la presentación, minuto a minuto |
## Licencia y contacto

Proyecto académico individual. Para solicitar el retiro de una foto o reportar
un problema con el sitio, abre un *issue* en este repositorio.

