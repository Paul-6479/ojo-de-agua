@AGENTS.md

# Ojo de Agua — documento maestro del proyecto

> Este archivo es el traspaso completo entre sesiones de Claude Code. Si eres una
> sesión nueva: **lee esto entero antes de tocar nada**. Contiene la idea, las
> decisiones ya tomadas (no las vuelvas a proponer), la arquitectura, el plan, el
> estado actual y la forma de trabajo acordada con el autor.
>
> Última actualización: 2026-09-13 (revisión de arquitectura: se eliminaron las
> contradicciones entre RLS, validación en servidor y separación público/privado).

---

## 0. Cómo se trabaja en este proyecto (REGLA PRINCIPAL)

**El trabajo pesado de programación lo hace Codex. Claude supervisa.**

Esto lo pidió el autor explícitamente para no agotar los tokens de Claude en
escribir andamiaje. La división es:

- **Codex escribe el código.** Se le delega vía el agente `codex:codex-rescue`
  (herramienta `Agent`) o la skill `codex:rescue`. Se le manda una instrucción
  larga, autocontenida y en español, con el alcance cerrado de lo que debe
  producir y con la orden explícita de que **no cambie el stack ya decidido**.
- **Claude supervisa.** Es decir: define el alcance de cada tanda, redacta la
  instrucción para Codex, **revisa lo que Codex entregó de verdad** (no se
  confía del resumen: se leen los archivos y se corre `npm run build`), corrige
  lo que haya quedado mal, y le explica al autor qué pasó y qué sigue.
- **Claude no se pone a escribir la aplicación entera a mano.** Solo interviene
  directo para arreglos puntuales, para desbloquear a Codex cuando falla, o
  cuando la tarea es demasiado chica para justificar delegarla.

Antecedente importante: en la primera delegación **Codex falló a la mitad**
(`create-next-app` se cortó y dejó el directorio vacío). Claude lo detectó
revisando el directorio y corrió la inicialización a mano. **Moraleja: siempre
verificar el resultado de Codex contra el sistema de archivos, nunca contra su
reporte.**

Verificación mínima después de cada tanda de Codex:
1. `find src db -type f` — ¿existen los archivos prometidos?
2. `npm run build` — ¿compila limpio?
3. Leer los archivos clave que tocó.

---

## 1. Qué es Ojo de Agua

Plataforma web ciudadana para **reportar fugas y problemas de agua** en la zona
conurbada **Tampico – Ciudad Madero – Altamira**, Tamaulipas, México.

La gente reporta desde el teléfono **sin necesidad de crear cuenta**, y todo el
mundo ve un **mapa público** con los problemas, su estatus y su historial. El
objetivo de fondo es ser un medio de comunicación más claro entre COMAPA (el
organismo operador del agua) y la población.

**Nombre:** Ojo de Agua. En México un *ojo de agua* es un manantial, así que ya
pertenece al mundo del agua; y "ojo" carga la idea de vigilancia ciudadana. Ese
doble sentido es el gancho narrativo del proyecto.

**Descriptor:** «Reporte ciudadano del agua · Zona conurbada de Tampico»

**Deslinde obligatorio, visible en el pie de todas las páginas:** este es un
proyecto ciudadano independiente y **no** un canal oficial de COMAPA. No se usa
el nombre ni el logo de COMAPA como si fueran propios. Esto es una protección
legal real, no un detalle de estilo.

### Contexto académico (define las prioridades)

- Es un proyecto **individual** para una materia de **proyecto integrador /
  emprendimiento**.
- Plazo: **1 a 2 meses**.
- **Se califica la propuesta de valor, el problema social y la presentación** —
  no la robustez interna ni la cobertura de pruebas.
- Se despliega ahora como demo, con intención de abrirlo al público después.

**Consecuencia práctica para cualquier sesión futura:** prioriza lo que se ve y
se demuestra (portada con métricas de impacto, flujo de reporte impecable en
móvil, mapa vistoso) por encima de robustez, pruebas y endurecimiento. El
antispam, la moderación y el aviso de privacidad se dejan *preparados* pero no
endurecidos hasta que haya público real.

### Perfil del autor

Estudiante de ingeniería mecatrónica, tesorero de la sociedad de alumnos. Sabe
algo de JavaScript/TypeScript. **No conoce React ni Next.js** — el acuerdo
explícito es que el código se escribe de forma clara y legible porque él va a
aprender leyéndolo y modificándolo. Nada de trucos ingeniosos. Comentarios solo
donde el *porqué* no sea obvio. Toda la interfaz en español de México.

---

## 2. La tesis: dos proyectos, no uno

- **Fase A — Mapa ciudadano.** La población reporta, todos ven el mapa. **No
  necesita permiso de nadie** y tiene valor desde el día uno. *Esto es el
  producto.*
- **Fase B — Canal oficial COMAPA↔ciudadanía**, con estatus real de reparación y
  tiempos comprometidos. **No existe sin convenio con COMAPA.**

**Decisión del autor:** construir A completo, y dejar la infraestructura de B
**visible y usable con datos simulados** — es decir, un panel de operador que
funcione de verdad con un usuario COMAPA de prueba, demostrable en vivo. Así, el
día que consiga una reunión en COMAPA, no llega con una idea sino con una demo.

---

## 3. Decisiones ya tomadas (NO volver a proponer alternativas)

| Decisión | Elección | Motivo |
|---|---|---|
| Ciudad | Tampico, encuadrada como **zona conurbada** con Madero y Altamira | El problema del agua ahí es intermunicipal; la gente no distingue límites al reportar. Narrativa más fuerte. |
| Alcance de problemas | **Catálogo ampliado**, no solo fugas | Mismo modelo de datos, mucho más uso. |
| Base de datos / auth / storage | **Supabase** | Gratis sin tarjeta, trae auth y storage incluidos, soporta PostGIS. |
| Framework | **Next.js** (App Router, TypeScript) | Un solo repositorio y despliegue; el ecosistema de mapas web es JS. Se eligió sabiendo que hay curva de aprendizaje. |
| Estilos | **Tailwind CSS** | Ya viene instalado. |
| Mapa | **MapLibre GL JS** | Libre (BSD). **NO Google Maps ni Mapbox GL:** ambos cobran por carga de mapa y exigen tarjeta — riesgo de cobro sorpresa en un sitio público, y el presupuesto es cero. |
| Teselas del mapa | **MapTiler** (tier gratuito) | Rápido de arrancar. *Alternativa futura:* Protomaps autoalojado en almacenamiento propio (un `.pmtiles` de la ciudad, decenas de MB, cero dependencias y cero cuotas). |
| Hosting | **Vercel** (tier Hobby) | El autor ya tiene cuenta. Ojo: Hobby prohíbe uso comercial. |
| Nombre | **Ojo de Agua** | Ver §1. |

### Alternativas evaluadas y descartadas (no reabrir sin motivo nuevo)

- **Neon** en vez de Supabase: el autor ya lo conocía de otro proyecto, pero
  Supabase gana por traer auth y storage incluidos.
- **Leaflet + teselas de OpenStreetMap públicas**: la política de uso de OSM.org
  prohíbe aplicaciones de tráfico significativo. Solo servía para demo.
- **FastAPI/Python + frontend aparte**: dos despliegues y dos lenguajes sin
  ganancia real en una app de CRUD + mapa.
- **HTML + JS sin framework** y **Vite + React sin Next**: se le ofrecieron al
  autor como caminos de menor curva; eligió Next.js a conciencia.

### Advertencia sobre Supabase

Los proyectos del tier gratuito **se pausan tras ~1 semana sin actividad** y se
reactivan con un clic. Riesgo real: llegar a la presentación con el proyecto
dormido. Mitigación planeada: una tarea programada trivial que toque la base de
datos a diario.

---

## 4. Actores y ciclo de vida de un reporte

| Actor | Puede |
|---|---|
| **Ciudadano anónimo** | Crear reporte; ver mapa y fichas; confirmar «yo también»; seguir su reporte por folio |
| **Ciudadano registrado** | Lo anterior + historial propio, notificaciones, reputación, editar/cancelar lo suyo |
| **Moderador** | Ocultar spam, fusionar duplicados, reclasificar, corregir ubicación |
| **Operador COMAPA** (fase B) | Cambiar estatus, asignar cuadrilla, fijar fecha estimada, cerrar con evidencia, publicar avisos |
| **Admin** | Gestionar usuarios y roles, ver bitácora de auditoría, configurar zonas y catálogos |

### Estados

Flujo principal: `recibido` → `validado` → `en_cola` → `en_proceso` → `resuelto`
→ `cerrado`

Ramas laterales: `duplicado` (apunta a un reporte padre), `rechazado`
(spam/falso/fuera de jurisdicción), `reabierto` (la fuga volvió — clave para la
credibilidad), `derivado` (corresponde a otra dependencia).

**Regla crítica:** el estatus público y el institucional **no son el mismo
campo**. Mientras COMAPA no participe, el estatus real solo puede ser
«reportado / confirmado por vecinos / marcado como resuelto por la comunidad».
Inventar «en proceso» sin base es mentirle a la gente. **La UI siempre etiqueta
la fuente de cada estado.**

Cada transición se escribe en una **bitácora inmutable** (quién, cuándo, de qué a
qué, nota, origen). Nunca se sobrescribe historial.

---

## 5. Modelo de datos

- **`reporte`** — folio público corto y legible (formato `OJO-2026-0142`), tipo
  de problema, severidad, descripción, ubicación, referencia textual de
  calle/colonia, municipio, estatus actual, fecha de creación, fecha estimada de
  resolución por COMAPA, fecha real de cierre, id del reporte padre si es
  duplicado (auto-referencia), hash del reportante anónimo, visibilidad
  pública, **`origen_estatus`** (ciudadano / comunidad / moderador / comapa /
  sistema — desnormalizado del último evento de la bitácora, para que mapa y
  ficha etiqueten la fuente sin recorrer la bitácora). **El contador de
  confirmaciones NO se guarda en la fila**: se calcula al vuelo sumando las del
  reporte y las de sus hijos fusionados (ver §7.2). **El folio lo genera
  Postgres** con una secuencia por año y un trigger al insertar — nunca la
  aplicación, porque dos reportes simultáneos chocarían.
- **`evento_reporte`** — bitácora: reporte, tipo de evento, estado anterior,
  estado nuevo, autor, rol, nota, origen (ciudadano/moderador/COMAPA/sistema),
  timestamp.
- **`foto`** — reporte, ruta en storage, miniatura, si es evidencia de «antes» o
  «después», si está moderada. **Los metadatos EXIF se eliminan al subir.**
- **`confirmacion`** — reporte + identificador del confirmante (hash anónimo o
  usuario), **`tipo`** (`afectado` = «yo también» / `resuelto` = «ya la
  arreglaron»), comentario corto, timestamp. Unicidad por reporte+identificador+tipo.
  El cierre comunitario de §7.3 es simplemente «≥ 2 confirmaciones de tipo
  `resuelto` de identificadores distintos»; no necesita otra tabla.
- **`intento`** — límite de tasa: hash del dispositivo, IP, timestamp. Vercel
  corre cada petición sin estado, así que un contador en memoria no sirve; se
  cuenta en esta tabla dentro de una ventana de tiempo.
- **`tasa_fuga`** — catálogo tipo × severidad → litros/hora estimados. Alimenta
  la métrica de «litros perdidos» (§7.3); va en tabla y no en código para poder
  ajustarla sin desplegar.
- **`usuario`** — solo registrados: contacto verificado, rol, reputación,
  colonias de interés.
- **`municipio`** — nombre y polígono (solo los tres de la conurbación). Sirve
  para el límite geográfico del antispam y para agregados.
- **`colonia`** — en la demo es **texto libre normalizado** que escribe el
  usuario, no un polígono. Conseguir polígonos de colonias (INEGI, Marco
  Geoestadístico) es trabajo de datos que no cabe en el plan; el ranking por
  colonia se hace sobre el texto normalizado. Los polígonos quedan como mejora
  futura.
- **`cuadrilla` / `orden_trabajo`** — fase B; una orden agrupa varios reportes.
- **`aviso`** — cortes programados y comunicados: título, cuerpo, zona afectada,
  vigencia, fuente.

**Geolocalización:** columna `geography(Point,4326)` de **PostGIS** *más*
latitud/longitud numéricas separadas. PostGIS es lo que da «todo lo que esté a
menos de N metros» y «reportes dentro de este polígono» sin programar
trigonometría a mano; de ahí sale la deduplicación. Guardar además la **precisión
GPS en metros** y si el usuario **movió el pin manualmente** — sirve para calibrar
el radio de deduplicación.

**Índices:** GIST sobre la ubicación; índices sobre estatus y fecha.

**Función SQL `reportes_cercanos(lat, lon, radio_metros, dias)`** — devuelve
reportes abiertos cercanos. Se usa para detectar duplicados *antes* de crear uno
nuevo.

**Row Level Security y claves (decisión firme):**
- La clave `anon` (la que va al navegador) es **solo lectura**, y solo sobre la
  **vista `reporte_publico`** (más `aviso` y agregados). La vista ya trae las
  coordenadas redondeadas a ~25 m y **no expone** ubicación exacta, precisión
  GPS, hash del reportante ni ningún dato de contacto. Así la promesa de
  privacidad de §7.4 se cumple en la base de datos, no por convención del código.
- **La tabla `reporte` base no tiene ninguna política para `anon`.** Ni lectura
  ni inserción.
- **Toda escritura** (crear reporte, confirmar, registrar foto, cambiar estatus)
  pasa por rutas de Next.js que usan la clave **`service_role`**, que vive solo
  en el servidor (variable `SUPABASE_SERVICE_ROLE_KEY`, **sin** prefijo
  `NEXT_PUBLIC_`). Motivo: si `anon` pudiera insertar, cualquiera desde la
  consola del navegador saltaría honeypot, límite de tasa y límite geográfico.
- Las reglas de quién puede cambiar qué (moderador, operador, admin) viven en
  las rutas de Next.js, en TypeScript legible, no en SQL. Las rutas de
  moderación/operación verifican la sesión de Supabase Auth y el rol en `usuario`.

**Hash del reportante anónimo (definición):** en el primer reporte el servidor
genera un token aleatorio, se guarda en el navegador (`localStorage`) y su hash
SHA-256 es el identificador del dispositivo. Sirve para tres cosas: unicidad de
confirmaciones, límite de tasa, y que el reportante anónimo pueda editar o
cancelar lo suyo presentando el token. Es fácil de burlar borrando el
almacenamiento; ese es exactamente el nivel de fricción que §7.1 acepta.

---

## 6. Superficie de API

Rutas de servidor dentro de Next.js. **Toda escritura se valida en el servidor**
y se ejecuta con la clave `service_role`; el navegador nunca escribe directo en
Supabase (ver RLS en §5).

**Públicas, sin autenticación**
- Crear reporte (con límite de tasa).
- Listar reportes dentro de un rectángulo geográfico (`bbox`) con filtros de
  tipo, estatus y fechas → devuelve **GeoJSON**, que es lo que el mapa consume
  directo. *Es la ruta más llamada del sistema: cachear agresivamente (30–60 s).*
- Detalle de un reporte por folio, con historial público.
- Buscar posibles duplicados cerca de un punto (se llama *antes* de crear).
- Confirmar un reporte existente.
- Registrar una foto ya subida (ver §7.4 sobre EXIF; la subida va a un bucket
  de Storage con URL prefirmada que emite esta misma capa).
- Listar avisos vigentes.
- Estadísticas agregadas públicas.

**Con cuenta:** alta/verificación por código de un solo uso; mis reportes;
suscripción por colonia; notificaciones.

**Moderación / operación:** cambiar estatus con nota; marcar duplicado y
fusionar; ocultar/restaurar; aprobar fotos; fijar fecha estimada; avisos; bandeja
de trabajo; exportar CSV.

**Sistema:** tarea diaria que recalcula prioridades, marca reportes sin respuesta
prolongada, recalcula litros estimados perdidos y mantiene viva la base de datos.

---

## 7. Los problemas difíciles y sus mitigaciones

### 7.1 Spam sin fricción
**Regla de oro: reportar debe tomar menos de 60 segundos y sin cuenta.** Toda
fricción añadida reduce reportes legítimos mucho más que los falsos.

Capas, de menor a mayor fricción: trampa de campo oculto (honeypot) → límite de
tasa por IP y dispositivo → límite geográfico (fuera del polígono de la
conurbación se marca automáticamente) → **Cloudflare Turnstile** (captcha
invisible, gratis) → moderación **posterior** salvo las fotos, que sí entran en
cola de aprobación → reputación implícita por dispositivo → botón comunitario de
«esto no existe».

Para la demo basta honeypot + límite de tasa + límite geográfico. Turnstile se
deja conectado pero **desactivable por configuración** para no estorbar en las
pruebas.

**Lo que NUNCA se debe hacer:** exigir CURP, INE, teléfono obligatorio o cuenta
previa. Mata el proyecto.

### 7.2 Reportes duplicados
**Preventivo (lo más eficaz).** En cuanto el usuario fija el pin y *antes* de que
escriba nada, consultar reportes abiertos del mismo tipo dentro de ~75 m en los
últimos ~30 días. Si hay coincidencias, mostrarlas: *«Ya hay un reporte de fuga
en esta esquina desde hace 4 días. ¿Es la misma?»* con dos botones: **«Sí,
confirmo»** (suma confirmación y sube prioridad) y **«No, es otra»**. Esto
convierte reportes redundantes en la señal más valiosa del sistema: cuánta gente
está afectada.

**Correctivo.** Tarea nocturna que agrupa por densidad espacial
(`ST_ClusterDBSCAN` de PostGIS), radio ~60–80 m y ventana temporal. Grupos de
alta confianza se fusionan solos; los dudosos van a la cola del moderador.

**Ajustes:** radio mayor cuando la precisión GPS reportada era mala. Empezar en
75 m y calibrar con datos reales. **La fusión siempre es reversible** y conserva
los originales como hijos; nunca se borran. Las confirmaciones de los hijos
cuentan para el padre; por eso el contador se calcula al vuelo (§5) y el caché
de 30–60 s del GeoJSON absorbe el costo.

### 7.3 El tiempo estimado de resolución — la parte frágil
**Sin COMAPA no hay de dónde sacar ese dato.** Mostrar un número inventado con
apariencia oficial es peor que no mostrar nada: la gente lo cree, se decepciona,
y el proyecto pierde lo único que lo diferencia de quejarse en Facebook.

Escalones:
- **Nivel 0 (ahora):** **no mostrar estimación.** Mostrar en su lugar *«Reportado
  hace 6 días · sin atención confirmada»*. Ese contador es más honesto y
  políticamente más potente.
- **Nivel 1 (con ~3 meses de datos propios):** mediana real de la comunidad, con
  tamaño de muestra y etiqueta clarísima de que es estimación ciudadana.
- **Nivel 2 (con COMAPA):** fecha comprometida capturada por el operador. Solo
  aquí el campo merece llamarse «tiempo estimado de resolución».

En la base de datos van **tres campos separados** desde el principio:
`fecha_estimada_comapa`, `estimacion_estadistica` y `dias_sin_atencion`. **La UI
siempre etiqueta la fuente.**

**Misma disciplina para «litros estimados perdidos»** (métrica de la semana 5):
es un número derivado de la tabla `tasa_fuga` × días abiertos. Se muestra, porque
es la métrica vistosa, pero siempre con el supuesto visible («suponiendo N
litros/hora por fuga en banqueta»).

Riesgo adicional: los cierres («ya la repararon») en fase A vienen de ciudadanos,
que pueden equivocarse. Pedir confirmación de dos personas distintas, o foto,
antes de marcar resuelto.

### 7.4 Privacidad y riesgo legal
- **Eliminar EXIF de toda foto al subirla.** No negociable: las fotos de teléfono
  llevan coordenadas exactas. *Cómo:* la recompresión en el navegador con
  `canvas` (que §7.5 ya exige para bajarla a ~1200 px) **descarta el EXIF como
  efecto secundario** — compresión y limpieza son un solo paso en el cliente.
  Limitación aceptada para la demo: alguien que suba a mano saltándose el
  navegador conservaría el EXIF; cuando haya público real, la subida pasa por el
  servidor para limpiar ahí también.
- **Redondear la ubicación pública a ~20–30 m**, guardando la exacta solo para
  operación interna. Una fuga en la banqueta no identifica a nadie; «fuga dentro
  del domicilio» sí.
- **Nunca mostrar domicilio exacto ni nombre del reportante.** Siempre anónimo en
  público, incluso con cuenta.
- **Nunca pedir datos que no se van a usar.** Sin CURP, sin dirección completa,
  sin número de contrato. Teléfono/correo solo opcional y solo para notificar.
- **Moderación de fotos** también por privacidad: gente identificable, placas,
  interiores de casas.
- **Aviso de privacidad** conforme a la ley mexicana de datos personales en
  posesión de particulares (hay plantillas del INAI). Una página, no omitir.
- **Mecanismo de retiro** con contacto visible para bajar fotos de propiedad
  ajena.

### 7.5 Móvil en la calle con mala señal
Condición de uso real: parado en una banqueta, con sol, una mano, dos barras.
- **Mobile-first agresivo**: el formulario cabe en una pantalla; tipos de problema
  como iconos grandes, no lista desplegable; descripción opcional.
- **El pin arrastrable no es opcional**: el GPS urbano se equivoca 20–50 m.
- **Ligereza**: la página de reporte carga sin esperar el mapa completo.
- **PWA instalable** con service worker, y **cola offline** que reintenta al
  recuperar señal.
- **Comprimir la foto en el dispositivo** antes de enviar (máx ~1200 px).
- **Confirmación del folio persistente** en el navegador.
- **Clustering de pines** en el mapa: sin agrupamiento, cientos de reportes hacen
  inusable el mapa en un teléfono.
- Contraste alto (sol directo), objetivos táctiles grandes, español claro.

### 7.6 Adopción — el riesgo dominante
**No es un riesgo técnico.** Un mapa vacío no convence a nadie. Mitigación: un
**modo semilla** con reportes de ejemplo *marcados como tales*, activable para la
presentación; y antes de abrir al público, cargar 30–50 problemas reales
fotografiados en Tampico. Difusión por la sociedad de alumnos y grupos vecinales
de Facebook/WhatsApp.

Encuadre ante COMAPA: «herramienta que les ahorra llamadas y les da datos», no
«vigilancia de su incompetencia». **Los avisos de cortes programados y tandeo son
la carta de negociación**: es la funcionalidad que más les interesa porque les
baja llamadas al conmutador.

---

## 8. Plan por semanas (8 semanas)

| Semana | Entrega | Estado |
|---|---|---|
| **1** | Cimientos: Next.js desplegado en Vercel, esquema con PostGIS aplicado en Supabase, mapa MapLibre centrado en la conurbación con datos de ejemplo | ✅ (desplegado en Vercel el 2026-09-14) |
| **2** | Reportar: GPS + pin arrastrable, catálogo con iconos, foto comprimida sin EXIF, guardado real en Supabase, folio | ✅ 2026-09-13 |
| **3** | Ver y seguir: ficha pública con bitácora, consulta por folio, botón «yo también», detección preventiva de duplicados | ✅ 2026-09-14 (falta prueba visual en navegador) |
| **4** | Panel de operador (fase B simulada): login, roles, bandeja, cambio de estatus con nota, fecha estimada, cierre con evidencia | ⬜ |
| **5** | Portada de impacto: litros estimados perdidos, reportes sin atender, días promedio, ranking de colonias. **Es la semana que da la calificación.** | ⬜ |
| **6** | Comunicación bidireccional: avisos de cortes y tandeo con zona afectada en el mapa | ⬜ |
| **7** | Pulido: identidad visual, PWA, cola offline, accesibilidad, prueba en teléfono real bajo el sol | ⬜ |
| **8** | Cierre: datos semilla reales, documentación, aviso de privacidad, deslinde, ensayo de presentación | 🟡 adelantado: `docs/arquitectura.md`, `docs/operacion.md` y `/privacidad` existen desde 2026-09-14 |

---

## 9. Estado actual del código

**Hecho (semanas 1 y 2, verificado en navegador y con `curl` el 2026-09-13):**
- Next.js 16.3.5 + React 19.2.8 + Tailwind 4. Esquema `db/schema.sql`
  **aplicado en Supabase** (proyecto `cadfgpbbweztplthgdio`) vía MCP, con las
  funciones `reportes_cercanos` y `municipio_de_punto`. Bucket de Storage
  `fotos-reportes` creado (lectura pública, 3 MB, JPEG/WebP).
- Portada `/` con mapa MapLibre, clustering, filtros, popups. Lee datos reales
  de `GET /api/reportes` (GeoJSON, caché 30–60 s) y cae a `datosEjemplo.ts` si
  la base está vacía.
- Flujo `/reportar` en tres pasos (`src/components/reportar/`): GPS + pin
  arrastrable → tipo con iconos + aviso de duplicados (`/api/reportes/cercanos`)
  + severidad/descripción/referencia/colonia → fotos comprimidas en `canvas`
  (sin EXIF) + envío → confirmación con folio persistente en `localStorage`.
- `POST /api/reportes`: validación en servidor (`validarReporte.ts`) →
  honeypot → límite de tasa (3 por hash/IP cada 10 min, tabla `intento`) →
  límite geográfico (`municipio_de_punto`; fuera de zona se guarda como
  `rechazado` e invisible) → inserta `reporte` + `evento_reporte`.
- `POST /api/reportes/[id]/foto`: solo con el token del creador, máx. 3 fotos.
- Primer reporte real en la base: `OJO-2026-0001`.
- **Límites municipales reales** (2026-09-13): `src/lib/municipios.json` con
  los polígonos de OSM (ODbL) de Tampico, Madero y Altamira; el mapa los
  dibuja como contorno punteado y arranca con `bounds` sobre la zona urbana
  (Altamira el municipio mide 1 663 km², casi todo rural: no encuadrar
  completo). La tabla `municipio` en Supabase ya tiene estos polígonos en
  lugar de los rectángulos. Ojo: `maxBounds` debe ser bastante más ancho que
  la vista inicial, o MapLibre ignora `bounds` en pantallas anchas.

**Lecciones de la tanda 2 de Codex** (errores que Claude corrigió a mano):
- El honeypot rechazaba cuando el campo venía `undefined`; debe rechazar solo
  si viene *con contenido*.
- La columna `intento.ip` es `inet`: si no hay `x-forwarded-for` se guarda
  `null`, nunca un texto como «desconocida».
- El límite de tasa debe filtrar en la consulta (`.or(...)` + `count`), no
  traer todas las filas y filtrar en JS.
- **Carrera en `Mapa.tsx`:** el `fetch` de reportes reales termina antes del
  `load` de MapLibre; el mapa debe leer la lista más reciente desde un `ref`
  actualizado en un `useEffect` (el linter de React prohíbe escribir refs en
  el render).
- Codex no puede correr el build de Turbopack en su sandbox (usa
  `--webpack`); Claude debe correr `npm run build` normal para verificar.

**Semana 3 (2026-09-14):** ficha pública `/reporte/[folio]` (Server
Component, `src/lib/consultas.ts` lee `reporte_publico` + bitácora + fotos
aprobadas), `POST /api/reportes/[id]/confirmar` («yo también» / «ya la
arreglaron», tabla `confirmacion`, evento en bitácora), página `/seguir`,
mini-mapa MapLibre no interactivo cargado en diferido
(`components/reporte/MapaMini*.tsx`), helpers compartidos `lib/hash.ts` y
`lib/limiteTasa.ts`, y `db/semilla.sql` (16 reportes `es_ejemplo`, ya
aplicado en Supabase: folios `OJO-2026-0004` a `0019`). La instrucción de la
tanda vive en `docs/codex/tanda-3-ver-y-seguir.md`.

**Lecciones de la tanda 3:**
- **Codex agotó su cuota de ChatGPT (bloqueado hasta 2026-10-13)** tras
  entregar 6 archivos. Claude terminó el resto a mano. Si Codex vuelve a
  fallar, no insistir: seguir directo.
- El agente `codex:codex-rescue` corre en sandbox de **solo lectura** salvo
  que se invoque el companion con `--write` (`codex-companion.mjs task
  --write --fresh "..."`). Sin eso Codex no puede tocar archivos.
- **MapTiler no da mapas estáticos en el plan gratuito** («Invalid key»
  aunque las teselas funcionen). Para mapas chicos usar MapLibre con
  `interactive: false` y `next/dynamic` (`ssr: false`) desde un envoltorio
  cliente.
- El linter de React 19 prohíbe `setState` directo en `useEffect`; para leer
  `localStorage` se usa `useSyncExternalStore` (ver `useListaLocal` en
  `src/lib/dispositivo.ts`).

**Siguiente (semana 4):** panel de operador (fase B simulada): login con
Supabase Auth, tabla `usuario` con roles, bandeja, cambio de estatus con nota,
fecha estimada, cierre con evidencia.

**Lista original de la semana 1** (ya cumplida; se conserva como referencia):
1. `db/schema.sql` — esquema completo con PostGIS, enumerados, índices, la
   función `reportes_cercanos` y las políticas RLS. Comentado en español porque
   es entregable de la materia.
2. `src/lib/supabase.ts` — cliente de Supabase leyendo variables de entorno.
3. `.env.local.example` — documentar las variables: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPTILER_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). **Nunca escribir credenciales
   reales.** `src/lib/supabase.ts` expone dos clientes: uno público (anon) y
   uno de servidor (service_role) que solo se importa desde rutas de servidor.
4. `src/lib/tipos.ts` — tipos TypeScript espejo del esquema.
5. `src/lib/datosEjemplo.ts` — 12–20 reportes de ejemplo en colonias reales de
   Tampico, Madero y Altamira, marcados claramente como ejemplo.
6. `src/components/Mapa.tsx` — MapLibre GL, centrado ~22.2553 N, −97.8686 O,
   zoom 12, fuente GeoJSON **con clustering**, colores por estatus, popup con
   folio/tipo/días transcurridos, pantalla completa, bien en móvil.
7. `src/app/page.tsx` — mapa a pantalla completa, barra superior con el nombre y
   el descriptor, filtros por estatus y tipo, paleta de azules, pie con el
   deslinde.
8. `README.md` en español: qué es, cómo instalar, cómo aplicar el esquema en
   Supabase, qué variables configurar.

**Dependencias:** `maplibre-gl` y `@supabase/supabase-js` ya están instaladas.
`.env.local.example` ya existe. `AGENTS.md` contiene las reglas resumidas para
Codex (Codex lee `AGENTS.md`, no este archivo — mantener ambos en sincronía).

### Advertencias técnicas
- ⚠️ **MapLibre 6 + Turbopack: el worker no arranca solo.** MapLibre localiza
  su web worker con `import.meta.url`, y Turbopack no le da una URL http, así
  que el mapa queda en blanco **sin ningún error en consola** (tiles y puntos
  nunca llegan). Solución ya aplicada: `scripts/copiar-worker-maplibre.mjs`
  copia el worker a `public/maplibre/` (ignorado por git) en `predev`/`prebuild`,
  y `Mapa.tsx` llama `maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`.
  No quitar ninguna de las dos piezas.
- ⚠️ **`h-full` dentro de un hijo `flex-1` mide 0.** El contenedor del mapa usa
  `absolute inset-0` dentro de una sección `relative`.
- ℹ️ La prueba visual se hace con la extensión de Chrome (`mcp__claude-in-chrome`).
  El autor tiene **Dark Reader** instalado: oscurece la página y provoca un
  aviso de hidratación en la consola de Next. No es un bug del proyecto.
- ⚠️ **Next.js 16 tiene cambios de ruptura** respecto a lo que los modelos traen
  aprendido. Ver `AGENTS.md` (importado arriba): antes de escribir código, leer
  la guía correspondiente en `node_modules/next/dist/docs/`.
- ✅ **Vercel (2026-09-14):** proyecto `ojo-de-agua` en el equipo `ph-c90a`
  (plan Hobby), conectado al repo de GitHub: **cada `git push` a `main`
  despliega producción solo.** URL pública: `https://ojo-de-agua-ruby.vercel.app`.
  Las 4 variables de `.env.local` están cargadas en Production y Preview
  (`SUPABASE_SERVICE_ROLE_KEY` como *Secret*). Deployment Protection está
  **apagada** a propósito (sitio público). Lecciones:
  - `vercel deploy` desde CLI se queda en `UNKNOWN`/`BLOCKED`; usar siempre
    la vía de GitHub (`git push`).
  - Hobby bloquea despliegues (`COMMIT_AUTHOR_REQUIRED`) si el autor del
    commit no es una cuenta de GitHub del dueño. Git debe usar
    `paul.huertam@gmail.com` (ya configurado en `--global`).
  - `.vercel/` está ignorado por git; `vercel link` añade `VERCEL_OIDC_TOKEN`
    a `.env.local`, es inofensivo.
- ✅ **Repositorio remoto:** `https://github.com/Paul-6479/ojo-de-agua` (privado,
  creado 2026-09-13). Cada semana cerrada se sube con `git push` a `main`.
  `.env.local` nunca se sube; `.mcp.json` sí (solo trae el `project_ref`).
- ✅ **Supabase:** proyecto `cadfgpbbweztplthgdio`, conectado por MCP
  (`.mcp.json`). Pendiente al 2026-09-13: aplicar `db/schema.sql`, clave
  secreta y clave de MapTiler en `.env.local`.
- ✅ **Repositorio git propio con commit base** (2026-09-13, `8677228`). Antes
  git detectaba el repositorio accidental del *home*; nunca commitear desde ahí.
  Revisar cada entrega de Codex con `git diff` contra el último commit.
- ✅ **El proyecto vive en `~/Visual Studio Code/ojo-de-agua`, FUERA de iCloud**
  (movido el 2026-09-13). Antes estaba en `~/Documents/...` e iCloud evacuaba
  archivos de `node_modules` (`ls -lO` los mostraba `dataless`), lo que produjo
  builds erráticos. **No volver a mover el proyecto a `~/Documents` ni
  `~/Desktop`.** Si algún día un build falla raro, el remedio sigue siendo
  `rm -rf node_modules .next && npm install`.

---

## 10. Pendientes del autor (Claude no puede hacerlos)

1. **Crear el proyecto en Supabase** (supabase.com, no pide tarjeta). Anotar la
   URL del proyecto, la clave `anon` y la clave `service_role` (esta última va
   solo en `.env.local` y en Vercel, nunca en código ni en el navegador).
2. **Obtener una clave gratuita de MapTiler** (maptiler.com) para las teselas.
3. Copiar `.env.local.example` a `.env.local` y llenar las cuatro variables.
4. Aplicar `db/schema.sql` en el editor SQL de Supabase cuando exista.

---

## 11. Conectores y plugins del entorno

**Plugins de Claude Code instalados** (alcance de usuario):
- `codex@openai-codex` v1.0.6 — **el que hace el trabajo pesado.** Codex CLI
  0.154.0, autenticado por ChatGPT. Se invoca con el agente
  `codex:codex-rescue` o la skill `codex:rescue`.
- `engineering@engineering-local` v1.2.0 (autor: Anthropic) — instalado desde un
  zip local porque **no existe en el marketplace oficial**; se registró un
  marketplace local en `~/.claude/local-marketplaces/engineering-local/`. Aporta
  9 skills: `architecture`, `system-design`, `code-review`, `debug`,
  `testing-strategy`, `deploy-checklist`, `documentation`, `tech-debt`,
  `incident-response`.

**Servidores MCP que declara el plugin engineering:** Slack, Linear, Asana,
Atlassian, Notion, GitHub, PagerDuty, Datadog (todos por OAuth, ninguno conectado
automáticamente). **Ninguno es necesario para Ojo de Agua.**

**Servicios externos del proyecto:** Supabase (datos, auth, storage), MapTiler
(teselas), Vercel (hosting), y eventualmente Cloudflare Turnstile (captcha).

---

## 12. Preguntas abiertas

- ¿El proyecto se presenta con nombre e identidad propios, o desde la
  universidad? Afecta lo legal y lo político. (Inclinación actual: encuadre
  académico explícito, que es lo más protector.)
- ¿Se intenta el convenio con COMAPA durante el semestre o después, ya con
  usuarios en la mano? (Recomendación: después.)
- ¿Quién opera y modera la plataforma si sobrevive a la materia?
