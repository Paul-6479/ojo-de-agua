# Migraciones de base de datos

`db/schema.sql` es el **esquema completo y actual**: aplicarlo en una base vacía
deja todo listo y se puede volver a correr sin daño.

`db/migraciones/` son los cambios **sobre una base que ya existe**, en orden. Se
aplican en el editor SQL de Supabase (o por MCP) y todas son idempotentes.

| Archivo | Qué hace | Aplicada |
|---|---|---|
| `2026-09-28-confirmaciones.sql` | `intento.accion` (cupo por acción), `registrar_confirmacion`, `confirmaciones_resuelto` | ✅ 2026-09-28 |
| `2026-09-28-panel-operador.sql` | `foto.subida_por`, `cambiar_estatus_reporte`, `fijar_fecha_estimada`, vista `bandeja_operador` | ✅ 2026-09-28 |
| `2026-09-28-estadisticas.sql` | `litros_perdidos_reporte`, `estadisticas_publicas` | ✅ 2026-09-28 |
| `2026-09-28-avisos.sql` | tipo `tipo_aviso`, columnas de `aviso`, `avisos_vigentes` | ✅ 2026-09-28 |

**Las cuatro están aplicadas** en el proyecto `cadfgpbbweztplthgdio` desde el
2026-09-28, junto con `db/semilla-avisos.sql`. Se conservan aquí porque harían
falta si se reconstruyera la base desde cero (para eso basta `db/schema.sql`, que
ya las incluye).

**Si el proyecto vuelve a aparecer pausado** (pasa tras ~1 semana sin actividad):
reanúdalo desde el panel de Supabase y ya. Las migraciones siguen ahí, no hay que
volver a aplicarlas.

## Cómo aplicarlas

1. Entrar a supabase.com y **reactivar** el proyecto si aparece pausado.
2. SQL Editor → pegar el contenido de cada archivo, en orden, y ejecutar.
3. Datos de demostración (opcional pero recomendado para presentar):
   `db/semilla.sql` (reportes) y `db/semilla-avisos.sql` (avisos).
4. Crear el usuario del panel: ver `docs/operacion.md`, sección «Panel de
   operador».

## Qué pasa si no se aplican

La aplicación **no se cae**, pero varias partes degradan de forma visible:

| Sin aplicar | Síntoma |
|---|---|
| `confirmaciones` | El botón «yo también» falla con «No se pudo guardar tu confirmación» |
| `panel-operador` | La bandeja del panel da error al cargar |
| `estadisticas` | La portada muestra las cifras de ejemplo con su aviso ámbar |
| `avisos` | No aparece ningún banner de corte ni la página `/avisos` con contenido |
