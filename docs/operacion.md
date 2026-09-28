# Ojo de Agua — Guía de operación

Procedimientos para mantener el sitio vivo y limpio. Cada sección dice
**cuándo usarla**, qué necesitas y los pasos exactos. Para entender el sistema,
ver [`arquitectura.md`](./arquitectura.md); para instalarlo, el
[`README.md`](../README.md).

**Accesos necesarios:** cuenta de Supabase (proyecto `cadfgpbbweztplthgdio`),
cuenta de Vercel (proyecto `ojo-de-agua`), permiso de escritura en el
repositorio de GitHub y una copia local con `.env.local` llena.

---

## 1. Antes de una presentación

**Cuándo:** el día anterior a una demo.

1. **Despertar Supabase.** El plan gratuito pausa el proyecto tras ~1 semana
   sin actividad. Entra a <https://supabase.com/dashboard>; si el proyecto
   dice *Paused*, pulsa **Restore**. Tarda 1–2 minutos.
2. **Comprobar producción:** abre <https://ojo-de-agua-ruby.vercel.app>. El
   mapa debe mostrar pines; si sale «datos de ejemplo» en la esquina es que
   la base no respondió (vuelve al paso 1).
3. **Comprobar una ficha:** <https://ojo-de-agua-ruby.vercel.app/reporte/OJO-2026-0006>.
4. Si los datos de ejemplo se ensuciaron con pruebas, vuelve a cargar la
   semilla (sección 3).

---

## 2. Aplicar o actualizar el esquema

**Cuándo:** proyecto nuevo de Supabase, o cambió `db/schema.sql`.

1. Supabase → **SQL Editor** → *New query*.
2. Pega el contenido completo de `db/schema.sql` y ejecuta (*Run*).
   El archivo es idempotente (`create ... if not exists`, `create or replace`);
   se puede correr varias veces.
3. Verifica en **Table Editor** que existan `reporte`, `evento_reporte`,
   `confirmacion`, `foto`, `intento`, `municipio` y la vista `reporte_publico`.
4. Si el bucket de Storage no existe: **Storage → New bucket** →
   nombre `fotos-reportes`, público, límite 3 MB, tipos `image/jpeg` y
   `image/webp`.

**Deshacer:** no hay rollback automático. Si algo quedó mal, corrige el SQL y
vuelve a correrlo; las sentencias son de tipo «crear si no existe», así que
no destruyen datos.

---

## 3. Cargar los datos de ejemplo

**Cuándo:** mapa vacío para una demo, o los ejemplos quedaron alterados.

1. SQL Editor → pega `db/semilla.sql` completo → *Run*.
2. Resultado esperado: 16 reportes con `es_ejemplo = true` (la interfaz los
   marca como «Reporte de ejemplo»), su bitácora y algunas confirmaciones.

Es idempotente: cada ejecución **borra los ejemplos anteriores**
(`hash_reportante = 'semilla'`) y los vuelve a crear con folios nuevos. Los
reportes reales no se tocan.

**Quitar los ejemplos** (antes de abrir al público):

```sql
delete from confirmacion where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from foto where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from evento_reporte where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from reporte where hash_reportante = 'semilla';
```

---

## 4. Desplegar

**Cuándo:** hay cambios listos en `main`.

No hay que hacer nada especial: **cada `git push` a `main` despliega
producción** en ~30 s. Ver el progreso en
<https://vercel.com/ph-c90a/ojo-de-agua>.

Antes de hacer push, en local:

```bash
npm run lint && npm run build
```

**Si el despliegue sale `BLOCKED`** con `COMMIT_AUTHOR_REQUIRED`: el plan
Hobby exige que el autor del commit sea una cuenta de GitHub vinculada a
Vercel. Revisa `git config user.email` (debe ser el correo de GitHub) y vuelve
a commitear.

**No usar `vercel deploy` desde la terminal:** en este proyecto se queda
colgado en estado `UNKNOWN`. Siempre por GitHub.

**Rollback:** Vercel → *Deployments* → el último que funcionó → menú **⋯** →
**Promote to Production**. Es instantáneo y no toca la base de datos.

---

## 5. Cambiar variables de entorno

**Cuándo:** rotaste una clave de Supabase o MapTiler.

1. Actualiza `.env.local` en tu máquina (nunca se sube a git).
2. Vercel → *Settings → Environment Variables* → edita la variable en
   *Production* y *Preview*. `SUPABASE_SERVICE_ROLE_KEY` debe ser de tipo
   **Secret**; `NEXT_PUBLIC_MAPTILER_KEY` es pública a propósito (el
   navegador la necesita para las teselas).
3. Las variables se leen al construir: haz un **Redeploy** desde *Deployments*
   o un push nuevo.

---

## 6. Ocultar un reporte (spam, falso, ofensivo)

**Cuándo:** alguien reporta contenido inapropiado.

El panel ya permite **cambiar el estatus** de un reporte y **ocultar sus fotos**,
pero no tiene botón para quitar un reporte del mapa (`visible = false`). Para eso
sigue haciendo falta SQL. Si lo que sobra es solo la foto, usa el panel (§7).

```sql
-- 1. Localizar
select id, folio, tipo, descripcion, estatus from reporte where folio = 'OJO-2026-0042';

-- 2. Ocultar y dejar constancia en la bitácora (nunca borrar)
update reporte set visible = false, estatus = 'rechazado', origen_estatus = 'moderador'
where folio = 'OJO-2026-0042';

insert into evento_reporte (reporte_id, tipo_evento, estatus_anterior, estatus_nuevo, origen, nota)
select id, 'cambio_estatus', 'recibido', 'rechazado', 'moderador', 'Retirado por moderación: spam'
from reporte where folio = 'OJO-2026-0042';
```

**Deshacer:** `update reporte set visible = true, estatus = 'recibido' where folio = '...'`
y registra otro evento. El historial queda completo en ambos sentidos.

---

## 7. Retirar una foto

**Cuándo:** alguien pide bajar una foto de su propiedad o donde aparece una
persona identificable.

**Lo normal es hacerlo desde el panel:** abre `/panel/reporte/<folio>`, busca la
foto y pulsa **«Ocultar del público»**. Deja de verse al instante y el archivo se
conserva por si la petición estaba equivocada.

**Borrado definitivo** (solo si quien lo pidió exige que desaparezca):

1. Supabase → **Storage → fotos-reportes** → localiza el archivo (la ruta
   está en la tabla `foto`, columna `ruta_storage`) → **Delete**.
2. SQL: `delete from foto where ruta_storage = '<ruta>';`
3. Responde a quien lo pidió.

Las fotos nuevas no se muestran hasta aprobarse (`foto.aprobada = true`), así que
este caso debería ser raro.

---

## 8. Cambiar el estatus de un reporte a mano

**Cuándo:** un vecino confirma por otro medio que ya se reparó, o hay que
corregir un error.

**Primero intenta el panel:** `/panel/reporte/<folio>` cambia el estatus con nota
y lo registra en la bitácora solo. Pero el panel firma cada cambio como `comapa`
(operador) o `moderador`, y **no puede registrar un cambio con origen
`comunidad`** — para eso, y solo para eso, hace falta SQL:

```sql
update reporte set estatus = 'resuelto', origen_estatus = 'comunidad', cerrado_en = now()
where folio = 'OJO-2026-0042';

insert into evento_reporte (reporte_id, tipo_evento, estatus_anterior, estatus_nuevo, origen, nota)
select id, 'cambio_estatus', 'recibido', 'resuelto', 'comunidad', 'Vecinos confirman reparación'
from reporte where folio = 'OJO-2026-0042';
```

Usa siempre el `origen` verdadero: `comunidad` si lo dijeron vecinos,
`moderador` si lo decidiste tú. **Nunca** `comapa` sin que COMAPA lo haya
dicho.

---

## 9. Diagnóstico rápido

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Mapa gris sin teselas | Clave de MapTiler ausente o inválida | Revisar `NEXT_PUBLIC_MAPTILER_KEY` en Vercel y en `.env.local` |
| «N reportes · datos de ejemplo» en producción | Supabase pausado o clave `anon` mal | Sección 1, paso 1; luego sección 5 |
| «No se pudieron cargar los reportes» en `/api/reportes` | Igual que arriba, o el esquema no está aplicado | Sección 2 |
| Mapa en blanco en local, sin errores en consola | Falta el worker de MapLibre | `npm run dev` lo copia solo (`scripts/copiar-worker-maplibre.mjs`); si no, `rm -rf .next && npm run dev` |
| Build falla de forma rara en local | `node_modules` corrupto | `rm -rf node_modules .next && npm install` |
| Un usuario no puede reportar: «Espera unos minutos» | Límite de tasa (3 cada 10 min) | Es normal. Para pruebas: `delete from intento where creado_en < now();` |
| Despliegue `BLOCKED` | Autor del commit no vinculado | Sección 4 |

---

## 10. Escalación

Proyecto individual: el responsable es el autor. Contacto por *issues* en el
repositorio <https://github.com/Paul-6479/ojo-de-agua>. Para incidentes de
Supabase o Vercel, sus páginas de estado: <https://status.supabase.com> y
<https://www.vercel-status.com>.

## Panel de operador (semana 4)

El panel vive en `/panel` y es la **fase B simulada**: demuestra en vivo cómo se
vería el canal COMAPA↔ciudadanía sin que exista todavía un convenio. Todo lo que
se cambia ahí sale en la ficha pública etiquetado como «según COMAPA».

### Cuenta de prueba (ya creada)

| | |
|---|---|
| **Correo** | `demo.comapa@ojodeagua.mx` |
| **UUID** | `fe0f7fda-d9e9-46d4-8d7f-99d83f35729a` |
| **Rol** | `operador` — puede hacer todo lo que se demuestra |
| **Creada** | 2026-09-28, ya confirmada (no hay que validar ningún correo) |
| **Contraseña** | **no se guarda en este repositorio** |

Sirve para probar y demostrar el panel completo: bandeja, cambio de estatus con
nota, fecha comprometida, moderación de fotos y cierre con evidencia.

**La contraseña se queda fuera del repositorio a propósito.** Aunque el repo sea
privado hoy, con esa cuenta se puede alterar el estatus de reportes que sí se
publican en el mapa público, y un repositorio es el lugar equivocado para una
credencial que abre una consola de operación. Guárdala en tu gestor de
contraseñas. Si se pierde: Authentication → Users → el usuario → *Reset
password*.

### Crear otro usuario de panel

1. **Authentication → Users → Add user**: correo y contraseña. Marcar
   «Auto Confirm User» para no depender del correo de confirmación.
2. Copiar el `id` (UUID) del usuario recién creado.
3. En el editor SQL, darle el rol:

   ```sql
   insert into usuario (id, rol) values ('<UUID-del-usuario>', 'operador')
   on conflict (id) do update set rol = 'operador';
   ```

Para demostrar la diferencia de roles conviene tener también un `moderador`: ese
no puede comprometer fechas y sus cambios se etiquetan «según moderación» en vez
de «según COMAPA».

Roles que abren el panel: `moderador`, `operador`, `admin`. Un `ciudadano` con
cuenta entra a la app pero el panel lo rechaza con un aviso.

### Qué puede hacer cada rol

| Acción | moderador | operador | admin |
|---|---|---|---|
| Ver la bandeja y las fichas | sí | sí | sí |
| Cambiar estatus (con nota en bitácora) | sí, se registra como «según moderación» | sí, «según COMAPA» | sí, «según COMAPA» |
| Comprometer fecha de resolución | **no** | sí | sí |
| Aprobar u ocultar fotos | sí | sí | sí |
| Subir evidencia del «después» | sí | sí | sí |

La restricción de la fecha no es cosmética: §7.3 de `CLAUDE.md` dice que solo un
compromiso real de COMAPA merece llamarse «fecha estimada de resolución». Se
verifica en el servidor, no solo escondiendo el formulario.

### Reglas que impone el servidor

- **Transiciones válidas**: `TRANSICIONES` en `src/lib/tipos.ts`. No se puede
  saltar de `recibido` a `cerrado`; el `<select>` del navegador es una sugerencia
  y la ruta lo vuelve a comprobar.
- **Cerrar exige evidencia**: al menos una foto con `momento = 'despues'` y
  `aprobada = true`. Sin eso la ruta devuelve 409.
- **La bitácora es inmutable**: cada cambio inserta un `evento_reporte` con
  autor, rol, nota y origen, dentro de la misma transacción que el cambio
  (función `cambiar_estatus_reporte`).
- **Cerrar o resolver** fija `cerrado_en`; **reabrir** lo limpia.

### Sesión

La sesión es de Supabase Auth en cookies (`@supabase/ssr`). `src/proxy.ts`
—antes se llamaba `middleware.ts`— solo refresca la cookie; **la autorización de
verdad se revisa en cada página y en cada ruta** con `obtenerUsuarioSesion()` y
`exigirOperador()`. El proxy no es una barrera de seguridad, es una comodidad.

El cliente de sesión usa la clave `anon` y solo sirve para saber *quién* pide;
las escrituras siguen yendo por `service_role`, como manda `AGENTS.md`.

## Tarea diaria de mantenimiento

`GET /api/tareas/mantenimiento`, disparada por un cron de Vercel definido en
`vercel.json` a las **09:00 UTC** (≈ 3:00 a.m. en Tampico).

Hace dos cosas:

1. **Rellena `dias_sin_atencion`** de los reportes abiertos. La ficha pública
   calcula los días al vuelo, pero tener la columna al día permite ordenar por
   ella en SQL y prepara la estimación estadística del nivel 1 de §7.3.
2. **Borra los `intento` de más de 24 h.** Esa tabla solo sirve para la ventana
   de 10 minutos del límite de tasa; sin limpieza crecería para siempre.

Y de paso resuelve un problema real: **el plan gratuito de Supabase pausa el
proyecto tras ~1 semana sin actividad**, y el peor escenario es llegar dormido al
día de la presentación. Un `update` de verdad es mejor keep-alive que un
`select 1`, porque toca disco y no solo la caché de conexiones.

### Por qué es idempotente

La entrega de los cron de Vercel es *best effort*: puede no ocurrir, o **ocurrir
dos veces**. Por eso las dos operaciones son reconciliaciones («deja este valor
así»), no incrementos. Correrla cinco veces seguidas da el mismo resultado que
correrla una: la segunda corrida reporta `reportesActualizados: 0`.

### Seguridad

La ruta devuelve **401** si el encabezado `Authorization` no trae exactamente
`Bearer <CRON_SECRET>`. Vercel manda esa variable de entorno como encabezado
automáticamente. Sin la comprobación, la ruta quedaría abierta a internet.

`CRON_SECRET` **ya está cargada** en Production y Preview como *Secret*
(2026-09-28), y la ruta se verificó en producción: 401 sin secreto, 401 con uno
equivocado, y el resumen en JSON con el correcto.

Si algún día hay que volver a poner la variable, ojo con dos cosas:

- **Una variable nueva no tiene efecto hasta que se redespliega.** El comando que
  funciona en este proyecto es `npx vercel redeploy <url-de-produccion>`;
  `vercel deploy` se queda colgado en `UNKNOWN`/`BLOCKED` (ver §4).
- **Mientras la variable no exista, el cron se dispara pero recibe 401 y no hace
  nada**, sin avisar a nadie. Es un fallo silencioso: hay que comprobarlo a mano.

### Cómo comprobar que sigue viva

- **En Vercel:** Settings → Cron Jobs → *View Logs*. Debe haber una invocación
  diaria con respuesta 200.
- **A mano:** `curl -H "Authorization: Bearer <secreto>" https://ojo-de-agua-ruby.vercel.app/api/tareas/mantenimiento`
  Devuelve el resumen en JSON. Vale la pena hacerlo una vez al mes.

### Límites del plan Hobby

- **Una sola corrida al día.** Una expresión más frecuente hace fallar el
  despliegue.
- **La hora es aproximada:** Vercel invoca en cualquier momento dentro de la hora
  indicada (`0 9 * * *` puede caer entre 09:00 y 09:59 UTC).
- **Vercel no reintenta** una corrida que falle.

Esto **no sustituye** la lista de verificación de `docs/presentacion.md`: el cron
baja la probabilidad de que la base se duerma, pero revisar el sitio el día
anterior sigue siendo la red de seguridad.
