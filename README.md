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

🟡 **En construcción (semana 1 de 8).** Ya están el esquema PostGIS con RLS,
los tipos y cliente de Supabase, y el mapa MapLibre con 16 reportes de ejemplo
filtrables. Lo que sigue es el flujo para crear un reporte. Ver el plan completo
en [`CLAUDE.md`](./CLAUDE.md).

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
db/schema.sql            Esquema de la base de datos, comentado en español
src/app/                 Páginas (App Router de Next.js)
src/components/Mapa.tsx      Mapa MapLibre con agrupamiento de reportes
src/components/Filtros.tsx   Chips para filtrar el mapa en memoria
src/lib/supabase.ts      Cliente de Supabase
src/lib/tipos.ts         Tipos TypeScript espejo del esquema
src/lib/datosEjemplo.ts  Reportes de ejemplo para la demo (marcados como tales)
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

El proyecto se despliega en Vercel importando el repositorio y configurando las
mismas cuatro variables de entorno en *Settings → Environment Variables*.

## Licencia y contacto

Proyecto académico individual. Para solicitar el retiro de una foto o reportar
un problema con el sitio, abre un *issue* en este repositorio.
