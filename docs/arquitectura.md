# Ojo de Agua — Arquitectura

Documento técnico del proyecto para la materia de proyecto integrador.
Explica **qué se construyó, cómo está armado y por qué se tomaron las
decisiones**.

Cubre las 8 semanas del plan. Última revisión: 2026-09-28.

- Para instalarlo y correrlo: [`README.md`](../README.md).
- Para entender el código archivo por archivo y modificarlo:
  [`guia-del-codigo.md`](./guia-del-codigo.md).
- Para operarlo: [`operacion.md`](./operacion.md).

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

   PÚBLICO (sin cuenta)

   Portada            ───── Server Component ──────►  estadisticas_publicas()  ─►  reporte, confirmacion,
   (métricas)                                          (una sola consulta)          tasa_fuga
                      ───── GET /api/reportes ─────►  lee con clave anon  ───────►  vista reporte_publico
   Mapa (MapLibre)    ◄──── GeoJSON, caché 60 s ────                                (coords. redondeadas)

   Flujo /reportar    ───── POST /api/reportes ────►  valida, honeypot,   ───────►  reporte, evento_reporte,
   (3 pasos)                                          límite de tasa,               intento
                                                      límite geográfico
                                                      (clave service_role)
   Foto comprimida    ───── POST .../[id]/foto ────►  token del creador   ───────►  Storage + tabla foto
   sin EXIF

   Ficha /reporte/x   ───── Server Component ───────►  solo campos públicos ─────►  reporte_publico,
                                                                                    evento_reporte, foto
   «Yo también»       ───── POST .../confirmar ────►  registrar_confirmacion() ──►  confirmacion +
                                                      (una transacción)             evento_reporte
   /avisos            ───── Server Component ───────►  avisos_vigentes()  ───────►  tabla aviso

   PANEL DE PERSONAL (con cuenta y rol)

   /panel/entrar      ───── POST /api/panel/sesion ►  signInWithPassword ───────►  Supabase Auth
                      ◄──── cookie de sesión ───────   (clave anon)

   src/proxy.ts       ─────────────────────────────►  solo REFRESCA la cookie
                                                      (no autoriza nada)

   /panel (bandeja)   ───── Server Component ───────►  exigirOperador():   ───────►  vista bandeja_operador
                                                      getUser() + rol en usuario    (ubicación EXACTA)

   Cambiar estatus    ───── POST /api/panel/estatus►  valida la transición ──────►  cambiar_estatus_reporte()
                                                      y exige evidencia             (transacción: reporte +
                                                                                     bitácora + origen)
   Publicar aviso     ───── POST /api/panel/aviso ─►  solo operador/admin ───────►  tabla aviso

   SISTEMA

   Cron de Vercel     ───── GET /api/tareas/... ───►  compara CRON_SECRET ───────►  mantenimiento_diario()
   (1×/día)                                                                         (idempotente)
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
| **Autorización en las rutas de Next.js, no en RLS** | Políticas RLS por rol | Las reglas de «quién puede cambiar qué» son lógica de negocio; en TypeScript legible el autor las puede leer y modificar. RLS se usa para lo que sí le toca: que `anon` solo vea la vista pública |
| **El proxy solo refresca la cookie** | Autorizar en el proxy | La propia documentación de Next.js advierte que el proxy no es una solución de autorización. El rol se verifica en cada página y cada ruta, donde no se puede saltar |
| **`getUser()` y no `getSession()`** | `getSession()`, que es más rápido | `getSession()` lee la cookie sin validarla: una cookie falsificada pasaría. `getUser()` verifica el token contra Supabase |
| **Operaciones de varios pasos en funciones SQL** | Varias consultas desde la ruta | Un fallo a media ruta dejaba la confirmación sin bitácora, o el estatus cambiado sin registro. `registrar_confirmacion` y `cambiar_estatus_reporte` son una sola transacción |
| **Portada como Server Component** | Cliente que pide las cifras por `fetch` | Las métricas son el argumento de la presentación: deben estar en el HTML inicial, sin parpadeo ni pantalla vacía |
| **Cifras de respaldo si la base no responde** | Mostrar un error o ceros | Una portada vacía no convence a nadie. Si Supabase está dormido se usan cifras de ejemplo **con un aviso visible** de que lo son |
| **Zona del aviso por municipio y colonias en texto** | Dibujar polígonos a mano | No hay polígonos de colonia, y los municipales ya estaban cargados en el mapa. Dibujar zonas es una función de editor que no cabe en el plan |
| **Iconos de la PWA generados con `next/og`** | Archivos PNG en el repositorio | El icono se edita como código, sin editor de imágenes ni binarios en git |
| **La cola offline no guarda fotos** | Convertir la foto a texto para `localStorage` | Un par de fotos en base64 llenan la cuota del navegador. Se envía el reporte sin fotos y **la interfaz lo dice**, en vez de fingir que se guardaron |
| **Tarea diaria idempotente** | Un contador o un `select 1` | Los cron de Vercel son «best effort»: pueden duplicarse o perderse. Las operaciones son reconciliaciones, y un `update` real es mejor keep-alive que un `select 1` |

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
usuario ──► auth.users              (rol: ciudadano, moderador, operador, admin)
aviso                               (cortes y tandeo: tipo, municipios[], colonias[], vigencia)
cuadrilla, orden_trabajo            (fase B, preparadas y sin usar todavía)
```

**Vistas y funciones** (todas en [`db/schema.sql`](../db/schema.sql)):

| Nombre | Para qué | Quién la puede llamar |
|---|---|---|
| vista `reporte_publico` | Lo único que el navegador puede leer. Coordenadas redondeadas a ~25 m | `anon` |
| vista `bandeja_operador` | La bandeja del panel. Trae **ubicación exacta** | solo `service_role` (revocada a `anon`) |
| `reportes_cercanos()` | Posibles duplicados antes de crear | `anon` |
| `asignar_folio_reporte()` | *Trigger*: asigna el folio al insertar | automática |
| `completar_ubicacion_reporte()` | *Trigger*: arma el punto PostGIS a partir de latitud y longitud | automática |
| `litros_perdidos_reporte()` | Litros estimados de un reporte suelto (la portada suma en bloque) | servidor |
| `municipio_de_punto()` | Límite geográfico del antispam | servidor |
| `registrar_confirmacion()` | Confirmación + bitácora en una transacción | servidor |
| `confirmaciones_resuelto()` | Cierres comunitarios, incluidos los duplicados fusionados | servidor |
| `cambiar_estatus_reporte()` | Estatus + bitácora + `origen_estatus` + `cerrado_en`, en una transacción, con `for update` | servidor |
| `fijar_fecha_estimada()` | Fecha comprometida por COMAPA + bitácora | servidor |
| `estadisticas_publicas()` | Todas las cifras de la portada en un solo JSON | `anon` |
| `avisos_vigentes()` | Avisos filtrados por fecha en la base | `anon` |
| `mantenimiento_diario()` | Tarea del cron: rellena `dias_sin_atencion`, limpia `intento` | servidor |

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
- **Transiciones válidas en un solo lugar**: `TRANSICIONES` en
  [`src/lib/tipos.ts`](../src/lib/tipos.ts) dice de qué estado se puede pasar a
  cuál. La interfaz lo usa para pintar los botones y **la ruta lo vuelve a
  comprobar**, porque el `<select>` del navegador es una sugerencia, no una
  garantía.
- **`intento.accion`**: el límite de tasa tiene un cupo por tipo de acción
  (3 reportes y 15 confirmaciones cada 10 minutos). Con un solo balde, el flujo
  «reporto → me avisa de un duplicado → confirmo» se autobloqueaba.
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

### Autenticación y autorización del panel

El panel es la única parte con cuentas, y tiene tres capas bien separadas:

1. **Quién eres** (autenticación): Supabase Auth con correo y contraseña. La
   sesión viaja en cookies, manejada por `@supabase/ssr`. Ese cliente usa la
   clave `anon` y **solo sirve para identificar**, nunca para escribir.
2. **Qué puedes hacer** (autorización): `exigirOperador()` en
   [`src/lib/sesion.ts`](../src/lib/sesion.ts) valida el token con `getUser()`
   y lee el rol de la tabla `usuario`. Se llama **en cada página y en cada ruta
   del panel**. `src/proxy.ts` solo refresca la cookie; no autoriza nada.
3. **Qué escribe**: la escritura sigue yendo por `service_role`, igual que en el
   resto de la aplicación.

Reglas de rol que impone el servidor, no la interfaz:

| Regla | Por qué |
|---|---|
| Un `moderador` no puede comprometer fechas | Solo un compromiso real de COMAPA merece llamarse «fecha estimada de resolución» |
| Los cambios de un `moderador` se registran como `origen: moderador`, no `comapa` | La etiqueta de fuente es el argumento central del proyecto; falsearla lo destruye |
| Cerrar exige una foto del «después» aprobada | Un cierre sin evidencia es otra promesa sin respaldo |
| Un aviso sin fuente declarada se publica como «Ojo de Agua (demostración)» | Nunca atribuirle a COMAPA algo que COMAPA no dijo |

**La tarea del cron** (`/api/tareas/mantenimiento`) compara el encabezado
`Authorization` contra `CRON_SECRET`, que Vercel envía solo a sus propias
invocaciones. Sin esa comprobación la ruta quedaría abierta a internet.

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

### Portada de impacto

Las cifras salen de una sola llamada a `estadisticas_publicas()` desde un Server
Component, con revalidación cada 5 minutos: son tendencias, no un marcador en
vivo. Dos decisiones de honestidad:

- **Los litros perdidos son una estimación** (`tasa_fuga` × horas abiertas) y el
  supuesto se muestra **junto a la cifra**, no en una nota al pie. La tabla
  `tasa_fuga` está en la base, no en el código, para poder ajustarla sin
  desplegar.
- **Para los cierres se usa la mediana, no el promedio**, y siempre con el
  tamaño de muestra: un reporte olvidado de 200 días inflaría un promedio.

### Panel de operador (fase B simulada)

Demuestra el canal COMAPA↔ciudadanía **antes de que exista el convenio**, con un
usuario de prueba real. El operador ve la bandeja priorizada (más confirmaciones
y más antiguos primero), cambia el estatus con una nota que el público lee, fija
la fecha comprometida, modera fotos por privacidad y cierra con evidencia. Todo
queda en la bitácora con autor, rol y origen, y la ficha pública pasa a decir
«según COMAPA».

### Avisos de corte y tandeo

Es la funcionalidad que más le interesa a COMAPA, porque les baja llamadas al
conmutador: es la carta de negociación del proyecto. Un aviso declara tipo,
municipios, colonias y vigencia; la vigencia se filtra en la base. Aparece en el
banner de la portada, en `/avisos` y **pintando de ámbar el municipio afectado en
el mapa**, reutilizando los polígonos que el mapa ya cargaba.

### Sin señal: PWA y cola offline

La condición de uso real es una banqueta con dos barras de señal. La aplicación
es instalable y su service worker va **primero a la red**: el caché es solo
respaldo, y nunca guarda `/api/`, para no mostrar cifras viejas. Si el envío de un
reporte falla, el reporte se guarda en `localStorage` y se reintenta solo cuando
el navegador dispara el evento `online`. Las fotos no se encolan, y eso se le
dice al usuario.

---

## 7. Lo que queda fuera y por qué

- **Tiempo estimado de resolución**: no se muestra hasta tener datos propios
  (mediana comunitaria con tamaño de muestra) o la fecha comprometida por
  COMAPA. Hay tres columnas separadas desde el principio
  (`fecha_estimada_comapa`, `estimacion_estadistica`, `dias_sin_atencion`)
  para nunca mezclar fuentes.
- **Polígonos de colonias**: en la demo la colonia es texto libre normalizado.
  Conseguir polígonos oficiales (INEGI) es trabajo de datos fuera del plan.
- **Endurecimiento** (Turnstile, moderación activa): preparado, no endurecido,
  hasta que haya público real. El aviso de privacidad sí está publicado.
- **Fusión automática de duplicados** (`ST_ClusterDBSCAN` nocturno): el diseño
  está en `CLAUDE.md` §7.2 y el esquema lo soporta (`reporte_padre_id`, y las
  confirmaciones de los hijos ya cuentan para el padre), pero la tarea que agrupa
  no está escrita. Hoy la deduplicación es solo preventiva, que es la que más
  sirve.
- **Notificaciones y cuentas para ciudadanos**: la tabla `usuario` existe y Auth
  ya está conectado por el panel, pero el ciudadano sigue siendo anónimo a
  propósito. Pedir cuenta para reportar es la decisión que mataría el proyecto.
- **Órdenes de trabajo y cuadrillas**: tablas creadas, sin interfaz. No tienen
  sentido sin un convenio real.

## 8. Riesgo principal: adopción

No es técnico. Un mapa vacío no convence a nadie. Mitigación: datos de ejemplo
marcados como tales para la demostración (`db/semilla.sql`), y antes de abrir
al público, cargar problemas reales fotografiados en la zona. Ante COMAPA, el
encuadre es «herramienta que les ahorra llamadas y les da datos»; los avisos
de cortes programados son la funcionalidad que más les interesa.
