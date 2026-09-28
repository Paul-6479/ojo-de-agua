-- 2026-09-28 · Semana 5: métricas de impacto de la portada. Idempotente.

-- Litros perdidos por un reporte: tasa del catálogo × horas que lleva abierto.
-- Es un SUPUESTO, no una medición, y la portada lo dice con esas palabras (§7.3).
-- Vive en la base y no en el código para poder ajustar tasa_fuga sin desplegar.
create or replace function litros_perdidos_reporte(p_reporte_id uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
  select coalesce(t.litros_por_hora * (extract(epoch from (coalesce(r.cerrado_en, now()) - r.creado_en)) / 3600.0), 0)
  from reporte r
  join tasa_fuga t on t.tipo = r.tipo and t.severidad = r.severidad
  where r.id = p_reporte_id;
$$;

-- Todas las cifras de la portada en una sola consulta: la portada es la página
-- más vista y no conviene hacerle cinco viajes a la base.
create or replace function estadisticas_publicas()
returns json
language sql stable security definer
set search_path = public
as $$
  with visibles as (
    select r.* from reporte r
    where r.visible = true and r.estatus <> 'rechazado' and r.estatus <> 'duplicado'
  ),
  abiertos as (
    select * from visibles where estatus in ('recibido', 'validado', 'en_cola', 'en_proceso', 'reabierto')
  ),
  cerrados as (
    select * from visibles where estatus in ('resuelto', 'cerrado') and cerrado_en is not null
  )
  select json_build_object(
    'total', (select count(*) from visibles),
    'abiertos', (select count(*) from abiertos),
    'cerrados', (select count(*) from cerrados),
    'reabiertos', (select count(*) from visibles where estatus = 'reabierto'),
    'sin_atender_mas_de_7_dias', (select count(*) from abiertos where creado_en < now() - interval '7 days'),
    'dias_promedio_abierto', (
      select round(avg(extract(epoch from (now() - creado_en)) / 86400.0)::numeric, 1) from abiertos
    ),
    -- Mediana, no promedio: un reporte olvidado de 200 días no debe inflar la cifra.
    'dias_mediana_cierre', (
      select round(
        (percentile_cont(0.5) within group (order by extract(epoch from (cerrado_en - creado_en)) / 86400.0))::numeric,
        1)
      from cerrados
    ),
    'muestra_cierres', (select count(*) from cerrados),
    'litros_perdidos', (
      select round(coalesce(sum(
        t.litros_por_hora * (extract(epoch from (coalesce(a.cerrado_en, now()) - a.creado_en)) / 3600.0)
      ), 0))
      from abiertos a join tasa_fuga t on t.tipo = a.tipo and t.severidad = a.severidad
    ),
    'confirmaciones', (select count(*) from confirmacion c join visibles v on v.id = c.reporte_id where c.tipo = 'afectado'),
    'por_tipo', (
      select coalesce(json_agg(fila order by fila.total desc), '[]'::json)
      from (select tipo, count(*)::integer as total from visibles group by tipo) fila
    ),
    'por_municipio', (
      select coalesce(json_agg(fila order by fila.total desc), '[]'::json)
      from (
        select coalesce(municipio::text, 'sin_municipio') as municipio, count(*)::integer as total,
          count(*) filter (where estatus in ('recibido','validado','en_cola','en_proceso','reabierto'))::integer as abiertos
        from visibles group by municipio
      ) fila
    ),
    -- Ranking por colonia sobre el texto normalizado que escribe la gente:
    -- no hay polígonos de colonia (decisión de §5).
    'ranking_colonias', (
      select coalesce(json_agg(fila order by fila.abiertos desc, fila.total desc), '[]'::json)
      from (
        select initcap(btrim(colonia)) as colonia,
          count(*)::integer as total,
          count(*) filter (where estatus in ('recibido','validado','en_cola','en_proceso','reabierto'))::integer as abiertos,
          max(extract(day from now() - creado_en))::integer as dias_del_mas_viejo
        from visibles
        where colonia is not null and btrim(colonia) <> ''
        group by initcap(btrim(colonia))
        order by abiertos desc, total desc
        limit 8
      ) fila
    ),
    'solo_ejemplos', (select coalesce(bool_and(es_ejemplo), true) from visibles),
    'calculado_en', now()
  );
$$;

grant execute on function estadisticas_publicas() to anon;
