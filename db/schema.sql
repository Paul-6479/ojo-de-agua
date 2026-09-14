-- Esquema inicial de Ojo de Agua. Se puede ejecutar más de una vez en Supabase.
create extension if not exists postgis;
create extension if not exists pgcrypto;

do $$ begin
  create type tipo_problema as enum ('fuga_calle', 'fuga_domicilio', 'sin_agua', 'baja_presion', 'agua_sucia', 'drenaje', 'alcantarilla', 'hidrante', 'otro');
exception when duplicate_object then null; end $$;
do $$ begin create type severidad as enum ('baja', 'media', 'alta'); exception when duplicate_object then null; end $$;
do $$ begin create type estatus_reporte as enum ('recibido', 'validado', 'en_cola', 'en_proceso', 'resuelto', 'cerrado', 'duplicado', 'rechazado', 'reabierto', 'derivado'); exception when duplicate_object then null; end $$;
do $$ begin create type origen_estatus as enum ('ciudadano', 'comunidad', 'moderador', 'comapa', 'sistema'); exception when duplicate_object then null; end $$;
do $$ begin create type tipo_confirmacion as enum ('afectado', 'resuelto'); exception when duplicate_object then null; end $$;
do $$ begin create type rol_usuario as enum ('ciudadano', 'moderador', 'operador', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type municipio_nombre as enum ('tampico', 'madero', 'altamira'); exception when duplicate_object then null; end $$;

create table if not exists municipio (
  id bigserial primary key,
  nombre municipio_nombre not null unique,
  poligono geography(MultiPolygon, 4326) not null
);

-- Estos rectángulos son aproximados; se sustituirán por el Marco Geoestadístico de INEGI.
insert into municipio (nombre, poligono) values
  ('tampico', ST_GeogFromText('MULTIPOLYGON(((-97.91 22.20,-97.82 22.20,-97.82 22.31,-97.91 22.31,-97.91 22.20)))')),
  ('madero', ST_GeogFromText('MULTIPOLYGON(((-97.88 22.22,-97.78 22.22,-97.78 22.32,-97.88 22.32,-97.88 22.22)))')),
  ('altamira', ST_GeogFromText('MULTIPOLYGON(((-97.99 22.32,-97.85 22.32,-97.85 22.46,-97.99 22.46,-97.99 22.32)))'))
on conflict (nombre) do nothing;

create table if not exists usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  rol rol_usuario not null default 'ciudadano',
  reputacion integer default 0,
  colonias_interes text[],
  creado_en timestamptz default now()
);

create sequence if not exists folio_seq;
create table if not exists reporte (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  tipo tipo_problema not null,
  severidad severidad not null default 'media',
  descripcion text check (char_length(descripcion) <= 500),
  ubicacion geography(Point, 4326) not null,
  latitud double precision not null,
  longitud double precision not null,
  precision_gps_m real,
  pin_movido boolean default false,
  referencia text,
  colonia text,
  municipio municipio_nombre,
  estatus estatus_reporte not null default 'recibido',
  origen_estatus origen_estatus not null default 'ciudadano',
  fecha_estimada_comapa date,
  estimacion_estadistica interval,
  dias_sin_atencion integer,
  reporte_padre_id uuid references reporte(id),
  hash_reportante text,
  visible boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  cerrado_en timestamptz
);

-- Postgres asigna el folio para que dos reportes simultáneos nunca choquen.
create or replace function asignar_folio_reporte() returns trigger language plpgsql as $$
begin
  if new.folio is null or new.folio = '' then
    new.folio := 'OJO-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('folio_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists antes_de_asignar_folio on reporte;
create trigger antes_de_asignar_folio before insert on reporte for each row execute function asignar_folio_reporte();

-- Las rutas envían coordenadas simples; el punto espacial se prepara aquí.
create or replace function completar_ubicacion_reporte() returns trigger language plpgsql as $$
begin
  if new.ubicacion is null then
    new.ubicacion := ST_SetSRID(ST_MakePoint(new.longitud, new.latitud), 4326)::geography;
  end if;
  return new;
end;
$$;
drop trigger if exists antes_de_completar_ubicacion on reporte;
create trigger antes_de_completar_ubicacion before insert or update on reporte for each row execute function completar_ubicacion_reporte();
create index if not exists reporte_ubicacion_idx on reporte using gist (ubicacion);
create index if not exists reporte_estatus_idx on reporte (estatus);
create index if not exists reporte_creado_en_idx on reporte (creado_en desc);
create index if not exists reporte_padre_idx on reporte (reporte_padre_id);

-- La bitácora es inmutable: conserva quién cambió cada estado y nunca se actualiza ni borra.
create table if not exists evento_reporte (
  id bigserial primary key,
  reporte_id uuid not null references reporte(id),
  tipo_evento text not null,
  estatus_anterior estatus_reporte,
  estatus_nuevo estatus_reporte,
  autor_id uuid references usuario(id),
  rol rol_usuario,
  nota text,
  origen origen_estatus not null,
  creado_en timestamptz default now()
);
create index if not exists evento_reporte_reporte_idx on evento_reporte (reporte_id);

create table if not exists foto (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references reporte(id),
  ruta_storage text not null,
  ruta_miniatura text,
  momento text check (momento in ('antes', 'despues')),
  aprobada boolean default false,
  creado_en timestamptz default now()
);
create table if not exists confirmacion (
  id bigserial primary key,
  reporte_id uuid not null references reporte(id),
  identificador text not null,
  tipo tipo_confirmacion not null,
  comentario text check (char_length(comentario) <= 200),
  creado_en timestamptz default now(),
  unique (reporte_id, identificador, tipo)
);
-- Vercel no mantiene memoria entre peticiones; aquí se cuenta la tasa de intentos.
create table if not exists intento (
  id bigserial primary key,
  hash_dispositivo text,
  ip inet,
  creado_en timestamptz default now()
);
create index if not exists intento_creado_en_idx on intento (creado_en);
create table if not exists tasa_fuga (
  tipo tipo_problema not null,
  severidad severidad not null,
  litros_por_hora numeric not null,
  primary key (tipo, severidad)
);
-- Son supuestos iniciales ajustables, no mediciones oficiales.
insert into tasa_fuga values
  ('fuga_calle', 'baja', 300), ('fuga_calle', 'media', 1000), ('fuga_calle', 'alta', 3000),
  ('fuga_domicilio', 'baja', 80), ('fuga_domicilio', 'media', 300), ('fuga_domicilio', 'alta', 800),
  ('hidrante', 'baja', 500), ('hidrante', 'media', 1500), ('hidrante', 'alta', 4000)
on conflict do nothing;
create table if not exists aviso (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cuerpo text not null,
  zona geography(MultiPolygon, 4326),
  municipio municipio_nombre,
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  fuente text,
  creado_en timestamptz default now()
);

-- La privacidad se cumple aquí y no por convención del código del navegador.
create or replace view reporte_publico with (security_invoker = false) as
select r.id, r.folio, r.tipo, r.severidad, r.descripcion,
  round(r.latitud::numeric, 4)::double precision as latitud,
  round(r.longitud::numeric, 4)::double precision as longitud,
  r.referencia, r.colonia, r.municipio, r.estatus, r.origen_estatus,
  r.fecha_estimada_comapa, r.estimacion_estadistica, r.dias_sin_atencion,
  r.reporte_padre_id, r.es_ejemplo, r.creado_en, r.cerrado_en,
  (select count(*)::integer from confirmacion c
   join reporte hijo on hijo.id = c.reporte_id
   where c.tipo = 'afectado' and (c.reporte_id = r.id or hijo.reporte_padre_id = r.id)) as confirmaciones
from reporte r where r.visible = true;
-- security_invoker=false permite leer la tabla base sin otorgársela a anon.

create or replace function reportes_cercanos(lat double precision, lon double precision, radio_metros integer default 75, dias integer default 30)
returns table (id uuid, folio text, tipo tipo_problema, severidad severidad, descripcion text, latitud double precision, longitud double precision, referencia text, colonia text, municipio municipio_nombre, estatus estatus_reporte, origen_estatus origen_estatus, fecha_estimada_comapa date, estimacion_estadistica interval, dias_sin_atencion integer, reporte_padre_id uuid, es_ejemplo boolean, creado_en timestamptz, cerrado_en timestamptz, confirmaciones integer, distancia_m double precision)
language sql stable security definer as $$
  select publico.*, ST_Distance(base.ubicacion, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) as distancia_m
  from reporte base join reporte_publico publico on publico.id = base.id
  where base.estatus not in ('resuelto', 'cerrado', 'rechazado', 'duplicado')
    and base.creado_en >= now() - make_interval(days => dias)
    and ST_DWithin(base.ubicacion, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radio_metros);
$$;

-- Determina el municipio de un punto sin exponer la tabla de polígonos al navegador.
create or replace function municipio_de_punto(lat double precision, lon double precision)
returns municipio_nombre
language sql stable
set search_path = public
as $$
  select nombre
  from municipio
  where ST_Covers(poligono, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography)
  limit 1;
$$;

alter table municipio enable row level security;
alter table usuario enable row level security;
alter table reporte enable row level security;
alter table evento_reporte enable row level security;
alter table foto enable row level security;
alter table confirmacion enable row level security;
alter table intento enable row level security;
alter table tasa_fuga enable row level security;
alter table aviso enable row level security;
revoke all on all tables in schema public from anon;
grant select on reporte_publico to anon;
grant select on aviso to anon;
grant execute on function reportes_cercanos(double precision, double precision, integer, integer) to anon;
drop policy if exists "anon lee avisos vigentes" on aviso;
create policy "anon lee avisos vigentes" on aviso for select to anon using (
  (vigente_desde is null or vigente_desde <= now()) and (vigente_hasta is null or vigente_hasta >= now())
);
-- Toda escritura pasa por rutas de servidor con service_role, que ignora RLS.

-- Fijar el search_path evita que un usuario malicioso redirija estas funciones a otro esquema (aviso del linter de Supabase).
alter function asignar_folio_reporte() set search_path = public;
alter function completar_ubicacion_reporte() set search_path = public;
alter function reportes_cercanos(double precision, double precision, integer, integer) set search_path = public;
alter function municipio_de_punto(double precision, double precision) set search_path = public;
