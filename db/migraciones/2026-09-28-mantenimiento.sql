-- 2026-09-28 · Tarea diaria de mantenimiento. Idempotente.
-- Vercel puede invocar un cron dos veces o ninguna (entrega "best effort"), así
-- que las dos operaciones son reconciliaciones: dejan el mismo resultado si se
-- corren una o cinco veces. Nada de contadores que se incrementen.
create or replace function mantenimiento_diario()
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_reportes integer;
  v_intentos integer;
begin
  -- Rellena dias_sin_atencion de los reportes abiertos. La ficha pública calcula
  -- los días al vuelo, pero tener la columna al día prepara la estimación
  -- estadística del nivel 1 de §7.3 y permite ordenar por ella en SQL.
  update reporte r
  set dias_sin_atencion = floor(extract(epoch from (now() - r.creado_en)) / 86400.0)::integer
  where r.estatus in ('recibido', 'validado', 'en_cola', 'en_proceso', 'reabierto')
    and coalesce(r.dias_sin_atencion, -1) <> floor(extract(epoch from (now() - r.creado_en)) / 86400.0)::integer;
  get diagnostics v_reportes = row_count;

  -- La tabla del límite de tasa solo sirve para una ventana de 10 minutos; sin
  -- esta limpieza crecería para siempre.
  delete from intento where creado_en < now() - interval '24 hours';
  get diagnostics v_intentos = row_count;

  return json_build_object(
    'reportesActualizados', v_reportes,
    'intentosBorrados', v_intentos,
    'corridaEn', now()
  );
end;
$$;
