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

**Cuándo:** alguien reporta contenido inapropiado. Todavía no hay panel de
moderación (semana 4), así que se hace en SQL.

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

1. Supabase → **Storage → fotos-reportes** → localiza el archivo (la ruta
   está en la tabla `foto`, columna `ruta_storage`) → **Delete**.
2. SQL: `delete from foto where ruta_storage = '<ruta>';`
3. Responde a quien lo pidió. Las fotos nuevas no se muestran hasta
   aprobarse (`foto.aprobada = true`), así que este caso debería ser raro.

---

## 8. Cambiar el estatus de un reporte a mano

**Cuándo:** un vecino confirma por otro medio que ya se reparó, o hay que
corregir un error. Hasta que exista el panel de operador:

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
