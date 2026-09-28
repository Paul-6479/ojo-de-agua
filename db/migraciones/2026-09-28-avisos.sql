-- 2026-09-28 · Semana 6: avisos de cortes y tandeo. Idempotente.
-- Esta es la funcionalidad que más le interesa a COMAPA (§7.6): les baja llamadas
-- al conmutador. Es la carta de negociación del proyecto.

do $$ begin create type tipo_aviso as enum ('corte', 'tandeo', 'baja_presion', 'mantenimiento', 'informativo');
exception when duplicate_object then null; end $$;

-- La zona afectada se expresa con los municipios y, si se sabe, los nombres de
-- colonia. No se dibujan polígonos a mano: no hay polígonos de colonia (§5) y
-- los municipales ya los tiene el mapa.
alter table aviso add column if not exists tipo tipo_aviso not null default 'informativo';
alter table aviso add column if not exists municipios municipio_nombre[] not null default '{}';
alter table aviso add column if not exists colonias text[] not null default '{}';
alter table aviso add column if not exists creado_por uuid references usuario(id);
alter table aviso add column if not exists publicado boolean not null default true;
create index if not exists aviso_vigencia_idx on aviso (vigente_hasta, vigente_desde);

-- Un aviso está vigente si ya empezó y no ha terminado. Se calcula en la base
-- para que el navegador no tenga que comparar fechas ni conocer la zona horaria.
create or replace function avisos_vigentes()
returns json
language sql stable security definer
set search_path = public
as $$
  select coalesce(json_agg(fila order by fila.vigente_desde desc nulls last), '[]'::json)
  from (
    select a.id, a.titulo, a.cuerpo, a.tipo::text as tipo,
      coalesce(array_to_json(a.municipios), '[]'::json) as municipios,
      coalesce(array_to_json(a.colonias), '[]'::json) as colonias,
      a.vigente_desde, a.vigente_hasta, a.fuente, a.creado_en
    from aviso a
    where a.publicado = true
      and (a.vigente_desde is null or a.vigente_desde <= now())
      and (a.vigente_hasta is null or a.vigente_hasta >= now())
  ) fila;
$$;

grant execute on function avisos_vigentes() to anon;
