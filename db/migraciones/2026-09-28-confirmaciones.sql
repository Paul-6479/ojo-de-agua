-- 2026-09-28 · Arreglos de la revisión de la semana 3.
-- Aplicar en el editor SQL de Supabase (o por MCP) sobre una base que ya tiene db/schema.sql.
-- Es idempotente: se puede correr dos veces sin daño.

-- 1. Cupo separado por acción en el límite de tasa.
alter table intento add column if not exists accion text not null default 'reporte';
create index if not exists intento_accion_creado_en_idx on intento (accion, creado_en);

-- Cuenta los cierres comunitarios del reporte y de sus duplicados fusionados (§7.2 de CLAUDE.md).
create or replace function confirmaciones_resuelto(p_reporte_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::integer
  from confirmacion c
  left join reporte hijo on hijo.id = c.reporte_id
  where c.tipo = 'resuelto'
    and (c.reporte_id = p_reporte_id or hijo.reporte_padre_id = p_reporte_id);
$$;

-- La confirmación y su renglón en la bitácora se guardan juntos o no se guardan:
-- dos insert desde la ruta de Next.js podían dejar la confirmación sin evento.
create or replace function registrar_confirmacion(
  p_reporte_id uuid,
  p_identificador text,
  p_tipo tipo_confirmacion,
  p_comentario text default null
)
returns table (repetida boolean, confirmaciones integer, resueltos integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  insert into confirmacion (reporte_id, identificador, tipo, comentario)
  values (p_reporte_id, p_identificador, p_tipo, p_comentario)
  on conflict (reporte_id, identificador, tipo) do nothing;
  get diagnostics v_filas = row_count;

  if v_filas > 0 then
    insert into evento_reporte (reporte_id, tipo_evento, origen)
    values (
      p_reporte_id,
      case when p_tipo = 'afectado' then 'confirmacion_afectado' else 'confirmacion_resuelto' end,
      'comunidad'
    );
  end if;

  return query
    select v_filas = 0,
      (select p.confirmaciones from reporte_publico p where p.id = p_reporte_id),
      confirmaciones_resuelto(p_reporte_id);
end;
$$;
