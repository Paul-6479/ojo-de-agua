# Guía del código

Esta guía es para **quien va a modificar este proyecto sabiendo JavaScript pero
no React ni Next.js**. No explica React desde cero; explica **las cinco ideas de
React y Next que este proyecto usa**, y luego dónde está cada cosa y cómo hacer
los cambios más probables.

- Si buscas *por qué* está armado así: [`arquitectura.md`](./arquitectura.md).
- Si buscas *cómo operarlo*: [`operacion.md`](./operacion.md).

---

## 1. Las cinco ideas que hay que entender

### 1.1 Un archivo `page.tsx` es una página; la carpeta es la URL

No hay archivo de rutas. La carpeta manda:

```
src/app/page.tsx                   →  /
src/app/seguir/page.tsx            →  /seguir
src/app/reporte/[folio]/page.tsx   →  /reporte/OJO-2026-0006
src/app/api/reportes/route.ts      →  /api/reportes
```

Los corchetes son un hueco: `[folio]` captura lo que venga en esa posición.
`page.tsx` pinta una página; `route.ts` responde datos (JSON).

### 1.2 Servidor o navegador: `"use client"` es la frontera

Por omisión, **un componente corre en el servidor**. Eso significa que puede
hablarle a la base de datos directamente y que el usuario recibe HTML ya hecho.

Cuando un archivo empieza con `"use client"`, corre **en el navegador**: puede
usar `useState`, responder a clics, leer `localStorage` y usar el GPS.

La regla práctica en este proyecto:

| Si el archivo… | Entonces |
|---|---|
| lee la base de datos | es de servidor (sin `"use client"`) |
| tiene botones, formularios o estado | es de cliente (`"use client"`) |
| usa `localStorage`, GPS o el mapa | es de cliente, obligatoriamente |

**El error clásico:** poner `"use client"` en una página que lee la base. Si lo
haces, la clave `service_role` acabaría en el navegador. Por eso
`crearClienteServidor()` lanza un error a propósito si detecta que corre en el
navegador — es una red de seguridad, no un adorno.

### 1.3 `useState`: lo que la pantalla recuerda

```tsx
const [enviando, cambiarEnviando] = useState(false);
```

`enviando` es el valor actual; `cambiarEnviando(true)` lo cambia **y vuelve a
pintar la pantalla**. Eso es todo. No hay que avisarle a nadie más ni tocar el
DOM: React lo repinta solo.

No se modifica el valor directamente (`enviando = true` no funciona). Siempre se
llama a la función.

### 1.4 `useEffect`: hacer algo *después* de pintar

Sirve para lo que no es pintar: pedir el GPS, arrancar el mapa, escuchar un
evento del navegador.

```tsx
useEffect(() => {
  navigator.geolocation.getCurrentPosition(/* … */);
}, []);   // el [] significa "una sola vez, al aparecer"
```

Si el efecto deja algo escuchando, tiene que apagarlo al desaparecer: por eso
varios efectos de este proyecto terminan con `return () => { … }`.

### 1.5 `async`/`await` en el servidor

Las páginas de servidor pueden ser `async` y esperar datos antes de pintar:

```tsx
export default async function Inicio() {
  const { datos } = await obtenerEstadisticas();
  return <MetricasImpacto datos={datos} />;
}
```

Ojo con una trampa de Next.js 16: **`params` y `searchParams` son promesas**. Hay
que escribir `const { folio } = await params;`. Si se olvida el `await`, el valor
llega como un objeto raro en vez de un texto.

---

## 2. El recorrido de un reporte, archivo por archivo

Seguir este camino completo es la forma más rápida de entender el proyecto.

```
1. src/app/reportar/page.tsx
   Guarda el borrador y coordina los tres pasos. Es de cliente.
        │
        ├─ src/components/reportar/PasoUbicacion.tsx   GPS + pin arrastrable
        ├─ src/components/reportar/PasoProblema.tsx    tipo, severidad, colonia
        │     └─ PosiblesDuplicados.tsx → GET /api/reportes/cercanos
        └─ src/components/reportar/PasoEnviar.tsx      fotos + botón enviar
              └─ src/lib/foto.ts   recomprime con canvas (y así borra el EXIF)
        │
        ▼  fetch POST
2. src/app/api/reportes/route.ts
   Corre en el servidor. En orden:
        ├─ src/lib/validarReporte.ts   ¿los datos tienen sentido?
        ├─ honeypot                    ¿el campo oculto viene lleno? → es un bot
        ├─ src/lib/limiteTasa.ts       ¿ya lleva 3 reportes en 10 minutos?
        ├─ municipio_de_punto()        ¿el punto cae en la conurbación?
        └─ insert en reporte + evento_reporte
        │
        ▼
3. Postgres asigna el folio con un trigger (nunca la aplicación: dos reportes
   simultáneos chocarían).
        │
        ▼
4. src/components/reportar/Confirmacion.tsx
   Muestra el folio y lo guarda en localStorage (src/lib/dispositivo.ts).
```

Si el `fetch` del paso 2 falla por falta de señal, entra
`src/lib/colaOffline.ts`: el reporte se guarda en el teléfono y se reintenta
cuando vuelve el internet.

---

## 3. Dónde está cada cosa

### Lo que ve cualquiera

| Quiero cambiar… | Archivo |
|---|---|
| Las cifras de la portada | `src/components/inicio/MetricasImpacto.tsx` (formato) y la función SQL `estadisticas_publicas` (cálculo) |
| El mapa: colores, agrupamiento, capas | `src/components/Mapa.tsx` |
| Los filtros del mapa | `src/components/Filtros.tsx` |
| El flujo de reporte | `src/app/reportar/page.tsx` y `src/components/reportar/` |
| La ficha pública de un reporte | `src/app/reporte/[folio]/page.tsx` |
| El pie con el deslinde | `src/components/PieDeslinde.tsx` |

### El panel de personal

| Quiero cambiar… | Archivo |
|---|---|
| Quién puede entrar | `src/lib/sesion.ts` (`ROLES_DEL_PANEL`) |
| La bandeja y su orden | `src/lib/panel.ts` (`listarBandeja`) |
| Las acciones del operador | `src/components/panel/` |
| Las reglas de qué se permite | `src/app/api/panel/*/route.ts` |

### Lo compartido

| Archivo | Qué hace |
|---|---|
| `src/lib/tipos.ts` | Tipos, catálogos (tipos de problema, estatus) y `TRANSICIONES` |
| `src/lib/supabase.ts` | Los dos clientes: público (`anon`) y de servidor (`service_role`) |
| `src/lib/dispositivo.ts` | Token anónimo y folios recientes en `localStorage` |
| `db/schema.sql` | El esquema completo, comentado |

---

## 4. Cómo hacer los cambios más probables

### Añadir un tipo de problema

Hay que tocar **tres** lugares, y el de SQL primero:

1. **La base**: `alter type tipo_problema add value 'nuevo_tipo';` (y una fila en
   `tasa_fuga` si aplica, o los litros perdidos lo ignorarán).
2. **El tipo de TypeScript**: añadirlo a `TipoProblema` en `src/lib/tipos.ts`.
3. **El catálogo**: una entrada en `CATALOGO_TIPOS` con su etiqueta y su emoji.

Si olvidas el paso 3, TypeScript te avisa al compilar, porque `CATALOGO_TIPOS`
es un `Record<TipoProblema, …>` y exige que estén todos. Eso es a propósito.

### Cambiar el radio de detección de duplicados

Hoy son 75 m y 30 días. El valor por omisión está en la función SQL
`reportes_cercanos`; quien la llama es `src/app/api/reportes/cercanos/route.ts`.

### Cambiar el límite de tasa

`LIMITE_REPORTES` y `LIMITE_CONFIRMACIONES` en `src/lib/limiteTasa.ts`.

### Añadir un campo a un reporte

1. `alter table reporte add column …` (y a `db/schema.sql`, para que quede).
2. Si el público lo debe ver, añadirlo a la vista `reporte_publico` — **y solo si
   de verdad debe ser público.** Esa vista es la promesa de privacidad.
3. Añadirlo a `ReportePublico` en `src/lib/tipos.ts`.
4. Aceptarlo en `src/lib/validarReporte.ts` si lo manda el usuario.

### Cambiar un texto de la interfaz

Están en los componentes, no en un archivo de traducciones. `grep -rn "el texto"
src/` lo encuentra en segundos. Todo va en español de México.

---

## 5. Trampas ya descubiertas (no volver a pisarlas)

Estas costaron tiempo. Están documentadas en `CLAUDE.md`, pero aquí en corto:

| Trampa | Qué pasa | Solución que ya está puesta |
|---|---|---|
| **MapLibre + Turbopack** | El mapa queda **en blanco sin ningún error** en consola | `scripts/copiar-worker-maplibre.mjs` copia el worker y `Mapa.tsx` llama `setWorkerUrl`. No quitar ninguna de las dos piezas |
| **`h-full` en un hijo de `flex-1`** | El mapa mide 0 px de alto | El contenedor usa `absolute inset-0` dentro de una sección `relative` |
| **`params` sin `await`** | Llega un objeto en vez del folio | `await params` siempre (Next.js 16) |
| **`setState` dentro de `useEffect`** | El linter de React 19 lo rechaza | Para leer `localStorage` se usa `useSyncExternalStore` (ver `useListaLocal`) |
| **MapTiler no da mapas estáticos gratis** | «Invalid key» aunque las teselas sí funcionen | Mapas chicos con MapLibre `interactive: false` y `next/dynamic` con `ssr: false` |
| **Supabase se pausa** | Todo falla de golpe tras una semana sin uso | Cron diario de mantenimiento; y reanudar a mano si ya pasó |
| **`.env*` en `.gitignore`** | También ignoraba `.env.local.example` | Excepción `!.env.local.example` |

---

## 6. Antes de dar por terminado un cambio

```bash
npm run build     # debe compilar sin errores ni warnings nuevos
npm run lint      # debe pasar limpio
```

El build usa Turbopack y es donde aparecen los errores de tipos. El linter de
React 19 es estricto con los hooks: si se queja, casi siempre tiene razón.

Y lo más importante: **abrir la página en el navegador**. Que compile no
significa que se vea bien, y mucho menos que se vea bien en un teléfono. La
prueba real de este proyecto es un teléfono, en la calle, con sol.
