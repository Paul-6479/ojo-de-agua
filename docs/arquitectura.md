# Ojo de Agua — Arquitectura

Documento técnico del proyecto para la materia de proyecto integrador.
Explica **qué se construyó, cómo está armado y por qué se tomaron las
decisiones**. Para instalarlo y correrlo, ver el [`README.md`](../README.md).

---

## 1. Contexto y objetivo

En la zona conurbada Tampico – Ciudad Madero – Altamira, una fuga de agua se
reporta hoy por teléfono o en redes sociales y se pierde: nadie sabe si ya la
vieron, si la van a atender, ni cuánta gente más sufre lo mismo.

Ojo de Agua es una plataforma web que convierte cada reporte en un **punto
público en un mapa con historial visible**, sin exigir cuenta a quien reporta.
Está pensada para usarse desde un teléfono, parado en la banqueta, con sol y
mala señal.

El proyecto se planteó en dos fases:

| Fase | Qué es | Depende de |
|---|---|---|
| **A — Mapa ciudadano** | La gente reporta, todos ven el mapa, los vecinos confirman | Nadie. Tiene valor desde el día uno |
| **B — Canal oficial** | El organismo operador (COMAPA) actualiza estatus reales y publica avisos de cortes | Un convenio con COMAPA |

Se construyó la fase A completa y se dejó la infraestructura de B preparada
en la base de datos (roles, estatus institucionales, avisos), de modo que una
reunión con COMAPA pueda partir de una demo y no de una idea.

**Deslinde:** es un proyecto ciudadano independiente. No es un canal oficial
de COMAPA ni usa su nombre o logo como propios. Esto se muestra al pie de
todas las páginas por protección legal.

---

## 2. Vista general

```
   Teléfono / navegador                    Vercel (Next.js 16)                    Supabase
   ─────────────────────                   ─────────────────────                  ────────────────────
                                                                                  
   Portada con mapa  ───── GET /api/reportes ─────►  lee con clave anon  ───────►  vista reporte_publico
   (MapLibre)        ◄──── GeoJSON, caché 60 s ────                                (coordenadas redondeadas)
                                                                                  
   Flujo /reportar   ───── POST /api/reportes ────►  valida, honeypot,   ───────►  tabla reporte
   (3 pasos)                                          límite de tasa,               tabla evento_reporte
                                                      límite geográfico             tabla intento
                                                      (clave service_role)
                                                                                  
   Foto comprimida   ───── subida directa ─────────────────────────────────────►  Storage fotos-reportes
   sin EXIF          ───── POST /api/reportes/[id]/foto ───────────────────────►  tabla foto
                                                                                  
   Ficha /reporte/x  ───── Server Component ───────►  lee con service_role ──────►  reporte_publico,
                                                      (solo campos públicos)        evento_reporte, foto
                                                                                  
   «Yo también»      ───── POST .../confirmar ─────►  hash del token,     ───────►  tabla confirmacion
                                                      límite de tasa                tabla evento_reporte
```

Tres piezas, un solo repositorio:

- **Next.js 16 (App Router, TypeScript)** en Vercel. Sirve las páginas y las
  rutas de API. Es a la vez frontend y backend.
- **Supabase**: PostgreSQL con PostGIS (datos geográficos), Storage (fotos) y
  Auth (para la fase B). Plan gratuito.
- **MapLibre GL JS + teselas de MapTiler**: el mapa. Software libre; MapTiler
  en plan gratuito.

---

## 3. Decisiones de diseño y sus motivos

| Decisión | Alternativas descartadas | Motivo |
|---|---|---|
| **Sin cuenta para reportar** | Registro obligatorio, CURP, teléfono | Cada paso de fricción elimina más reportes legítimos que falsos. Reportar debe tomar menos de 60 segundos |
| **Zona conurbada**, no solo Tampico | Una ciudad | El problema del agua es intermunicipal y la gente no distingue límites al reportar |
| **Catálogo ampliado** (fugas, sin agua, baja presión, agua sucia, drenaje, alcantarillas, hidrantes) | Solo fugas | Mismo modelo de datos, mucho más uso |
| **Next.js** | FastAPI + frontend aparte; HTML sin framework | Un solo despliegue; el ecosistema de mapas web es JavaScript |
| **Supabase** | Neon | Trae auth y storage incluidos, PostGIS, sin tarjeta |
| **MapLibre + MapTiler** | Google Maps, Mapbox, Leaflet + OSM | Google y Mapbox cobran por carga y exigen tarjeta (riesgo de cobro sorpresa en un sitio público con presupuesto cero). Las teselas públicas de OSM prohíben tráfico significativo |
| **Vercel Hobby** | — | El autor ya tenía cuenta; despliegue automático desde GitHub |
| **Estatus público ≠ estatus institucional** | Un solo campo de estatus | Mientras COMAPA no participe, decir «en proceso» sin base es mentirle a la gente. La interfaz siempre etiqueta de dónde sale cada estado |
| **No mostrar tiempo estimado de resolución** | Un número calculado o inventado | Sin datos de COMAPA no hay de dónde sacarlo. Se muestra «Reportado hace N días · sin atención confirmada», que es honesto y más contundente |

---

## 4. Modelo de datos

Esquema completo y comentado en [`db/schema.sql`](../db/schema.sql). Las
tablas principales:

```
reporte ──────< evento_reporte      (bitácora inmutable: quién, cuándo, de qué a qué)
   │
   ├─────────< confirmacion         («yo también» / «ya la arreglaron», uno por dispositivo)
   │
   ├─────────< foto                 (ruta en Storage, aprobada o no)
   │
   └── reporte_padre_id ──► reporte (auto-referencia para duplicados fusionados)

intento                             (límite de tasa: hash del dispositivo, IP, fecha)
municipio                           (polígonos reales de OSM para el límite geográfico)
tasa_fuga                           (litros/hora por tipo × severidad, para la métrica de impacto)
usuario, cuadrilla, orden_trabajo, aviso   (fase B, preparadas)
```

Puntos clave:

- **Folio legible** (`OJO-2026-0142`) generado por Postgres con una secuencia
  y un trigger, nunca por la aplicación: dos reportes simultáneos chocarían.
- **Geolocalización con PostGIS**: columna `geography(Point, 4326)` con índice
  GIST. Permite «todo lo que esté a menos de 75 m» sin trigonometría a mano;
  es la base de la detección de duplicados (`reportes_cercanos`) y del límite
  geográfico (`municipio_de_punto`).
- **Ciclo de vida**: `recibido → validado → en_cola → en_proceso → resuelto →
  cerrado`, con ramas `duplicado`, `rechazado`, `reabierto` y `derivado`. Cada
  transición se escribe en `evento_reporte`; el historial nunca se sobrescribe.
- **`origen_estatus`** en cada reporte (`ciudadano`, `comunidad`, `moderador`,
  `comapa`, `sistema`): es lo que permite que el mapa y la ficha digan «según
  vecinos» o «según COMAPA» sin recorrer la bitácora.
- **Confirmaciones no se cuentan en la fila**: se calculan al vuelo en la
  vista, sumando las del reporte y las de sus hijos fusionados. Así un
  duplicado fusionado suma su gente al reporte principal.
- **Identidad anónima**: en el primer reporte el navegador genera un token
  aleatorio (`localStorage`); el servidor guarda solo su SHA-256. Sirve para
  unicidad de confirmaciones, límite de tasa y para que el reportante pueda
  adjuntar fotos a lo suyo. Se burla borrando el almacenamiento, y ese es
  exactamente el nivel de fricción aceptado.

---

## 5. Seguridad y privacidad

**Principio: el navegador nunca escribe en la base de datos.**

- La clave `anon` (la que viaja al navegador) solo puede **leer la vista
  `reporte_publico`**. Esa vista redondea las coordenadas a ~25 m y no expone
  ubicación exacta, precisión GPS, hash del reportante ni ningún contacto.
  La tabla `reporte` no tiene ninguna política para `anon`.
- **Toda escritura** pasa por rutas de Next.js que corren en el servidor con la
  clave `service_role`, que nunca sale de ahí. Si el navegador pudiera
  insertar, cualquiera saltaría el antispam desde la consola.
- **Antispam sin fricción**, en capas: campo oculto para bots (honeypot) →
  límite de 3 intentos por dispositivo/IP cada 10 minutos (tabla `intento`,
  porque Vercel no guarda memoria entre peticiones) → el punto debe caer
  dentro de Tampico, Madero o Altamira (fuera de zona se guarda como
  `rechazado` e invisible). Cloudflare Turnstile queda preparado pero apagado.
- **Fotos sin metadatos**: se recomprimen en el teléfono con `canvas` a
  ~1200 px, lo que descarta el EXIF (incluidas coordenadas GPS) antes de
  subir. Las fotos entran en cola de aprobación antes de mostrarse.
- **Nunca** se muestra nombre, contacto ni domicilio exacto del reportante.
  Nunca se piden datos que no se usan (sin CURP, INE ni número de contrato).

---

## 6. Flujos principales

### Reportar (menos de 60 segundos, sin cuenta)

1. **Ubicación**: GPS con pin arrastrable (el GPS urbano falla 20–50 m; el pin
   no es opcional). Se guarda si el usuario lo movió y con qué precisión.
2. **Problema**: tipo con iconos grandes, severidad, referencia y colonia.
   Antes de escribir nada, se consulta `reportes_cercanos` y, si hay uno
   igual a menos de 75 m en 30 días, se ofrece **confirmarlo en lugar de
   duplicarlo**. Así el reporte redundante se convierte en la señal más
   valiosa: cuánta gente está afectada.
3. **Fotos y envío**: hasta 3 fotos comprimidas. Al terminar, el folio se
   guarda en el navegador para seguirlo después.

### Ver y seguir

- La **ficha pública** (`/reporte/OJO-2026-0006`) es un Server Component: lee
  la vista pública, la bitácora y las fotos aprobadas en el servidor y llega
  al teléfono como HTML. El mapa chico se carga después, en diferido, para
  que el texto aparezca aunque la señal sea mala.
- **«Yo también me afecta»** y **«Ya la arreglaron»** suman confirmaciones sin
  cuenta. Dos personas distintas marcando «ya la arreglaron» se muestran como
  cierre comunitario, pero **no cambian el estatus**: eso queda para
  moderación.
- `/seguir` busca por folio y lista los reportes hechos desde ese teléfono.

### Mapa

GeoJSON desde `GET /api/reportes` con caché de 30–60 s (es la ruta más
llamada). Agrupamiento (*clustering*) de pines: sin él, cientos de reportes
hacen inusable el mapa en un teléfono. Contornos municipales reales
(OpenStreetMap, ODbL) y color por estatus.

---

## 7. Lo que queda fuera y por qué

- **Tiempo estimado de resolución**: no se muestra hasta tener datos propios
  (mediana comunitaria con tamaño de muestra) o la fecha comprometida por
  COMAPA. Hay tres columnas separadas desde el principio
  (`fecha_estimada_comapa`, `estimacion_estadistica`, `dias_sin_atencion`)
  para nunca mezclar fuentes.
- **Polígonos de colonias**: en la demo la colonia es texto libre normalizado.
  Conseguir polígonos oficiales (INEGI) es trabajo de datos fuera del plan.
- **Endurecimiento** (Turnstile, moderación activa, aviso de privacidad
  formal): preparado, no endurecido, hasta que haya público real.

## 8. Riesgo principal: adopción

No es técnico. Un mapa vacío no convence a nadie. Mitigación: datos de ejemplo
marcados como tales para la demostración (`db/semilla.sql`), y antes de abrir
al público, cargar problemas reales fotografiados en la zona. Ante COMAPA, el
encuadre es «herramienta que les ahorra llamadas y les da datos»; los avisos
de cortes programados son la funcionalidad que más les interesa.
