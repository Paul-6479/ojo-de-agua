-- 2026-09-28 · Semana 4: panel de operador (fase B simulada).
-- Aplicar después de 2026-09-28-confirmaciones.sql. Idempotente.

-- El operador cierra con evidencia: una foto del "después" ya subida al bucket.
alter table foto add column if not exists subida_por uuid references usuario(id);

-- Cambiar de estatus toca tres cosas a la vez (reporte, bitácora y origen del
-- estatus). Si se hiciera desde la ruta con tres consultas, un fallo a medias
-- dejaría el historial mintiendo. Aquí es una sola transacción.
create or replace function cambiar_estatus_reporte(
  p_reporte_id uuid,
  p_estatus_nuevo estatus_reporte,
  p_autor_id uuid,
  p_rol rol_usuario,
  p_nota text default null,
  p_fecha_estimada date default null
)
returns table (estatus estatus_reporte, origen_estatus origen_estatus, cerrado_en timestamptz)
language plpgsql security definer
set search_path = public
as $$
declare
  v_anterior estatus_reporte;
  v_origen origen_estatus;
begin
  select r.estatus into v_anterior from reporte r where r.id = p_reporte_id for update;
  if v_anterior is null then
    raise exception 'El reporte no existe';
  end if;

  -- La UI siempre etiqueta la fuente del estado (§4 y §7.3): un cambio hecho por
  -- un operador es 'comapa', uno de moderación es 'moderador'.
  v_origen := case when p_rol = 'operador' then 'comapa'::origen_estatus
                   when p_rol = 'admin' then 'comapa'::origen_estatus
                   else 'moderador'::origen_estatus end;

  update reporte r set
    estatus = p_estatus_nuevo,
    origen_estatus = v_origen,
    fecha_estimada_comapa = coalesce(p_fecha_estimada, r.fecha_estimada_comapa),
    cerrado_en = case
      when p_estatus_nuevo in ('resuelto', 'cerrado') then coalesce(r.cerrado_en, now())
      when p_estatus_nuevo = 'reabierto' then null
      else r.cerrado_en
    end
  where r.id = p_reporte_id;

  insert into evento_reporte (reporte_id, tipo_evento, estatus_anterior, estatus_nuevo, autor_id, rol, nota, origen)
  values (p_reporte_id, 'cambio_estatus', v_anterior, p_estatus_nuevo, p_autor_id, p_rol, nullif(btrim(p_nota), ''), v_origen);

  return query
    select r.estatus, r.origen_estatus, r.cerrado_en from reporte r where r.id = p_reporte_id;
end;
$$;

-- Fijar la fecha comprometida sin cambiar de estatus. Es el único campo que
-- merece llamarse "tiempo estimado de resolución" (§7.3, nivel 2).
create or replace function fijar_fecha_estimada(
  p_reporte_id uuid,
  p_fecha date,
  p_autor_id uuid,
  p_rol rol_usuario,
  p_nota text default null
)
returns date
language plpgsql security definer
set search_path = public
as $$
begin
  update reporte set fecha_estimada_comapa = p_fecha where id = p_reporte_id;
  if not found then
    raise exception 'El reporte no existe';
  end if;

  insert into evento_reporte (reporte_id, tipo_evento, autor_id, rol, nota, origen)
  values (p_reporte_id, 'fecha_estimada', p_autor_id, p_rol,
    coalesce(nullif(btrim(p_nota), '') || ' · ', '') || 'Fecha comprometida: ' || to_char(p_fecha, 'DD/MM/YYYY'),
    'comapa');

  return p_fecha;
end;
$$;

-- Bandeja de trabajo: lo que el operador necesita priorizar, ya ordenado.
-- Vive en la base y no en la ruta para no traer columnas privadas al servidor
-- de más (aquí sí hay ubicación exacta: la lee service_role, nunca el navegador).
create or replace view bandeja_operador with (security_invoker = false) as
select r.id, r.folio, r.tipo, r.severidad, r.estatus, r.origen_estatus,
  r.colonia, r.municipio, r.referencia, r.descripcion,
  r.latitud, r.longitud,
  r.fecha_estimada_comapa, r.creado_en, r.cerrado_en, r.es_ejemplo, r.visible,
  extract(day from now() - r.creado_en)::integer as dias_abierto,
  (select count(*)::integer from confirmacion c
   left join reporte hijo on hijo.id = c.reporte_id
   where c.tipo = 'afectado' and (c.reporte_id = r.id or hijo.reporte_padre_id = r.id)) as confirmaciones,
  (select count(*)::integer from foto f where f.reporte_id = r.id) as fotos,
  (select count(*)::integer from foto f where f.reporte_id = r.id and f.aprobada = false) as fotos_por_aprobar
from reporte r;

revoke all on bandeja_operador from anon;
