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

-- Límites municipales reales (OpenStreetMap, ODbL, simplificados a ~40 m).
-- Sustituyen los rectángulos aproximados del bloque inicial.
update municipio set poligono = ST_GeogFromText('MULTIPOLYGON(((-98.2916645 22.4677985,-98.2895998 22.4678488,-98.2873693 22.4670281,-98.2853132 22.4653974,-98.2836129 22.4633832,-98.2792901 22.4513492,-98.2776214 22.4489489,-98.2755426 22.447674,-98.2729368 22.447291,-98.2621067 22.4503165,-98.2566341 22.4534061,-98.255475 22.4552794,-98.2533844 22.466461,-98.2520076 22.4692034,-98.2500403 22.4709148,-98.2479314 22.4716566,-98.2428542 22.4711771,-98.2403082 22.4697215,-98.2348247 22.462984,-98.2323651 22.4613309,-98.2296791 22.4621487,-98.2237373 22.469503,-98.2198436 22.4717509,-98.217822 22.4716522,-98.2140857 22.4699531,-98.2088277 22.4647623,-98.2070024 22.4640238,-98.2033556 22.4652298,-98.1988187 22.4687274,-98.1949952 22.4695589,-98.1935528 22.4687212,-98.1925622 22.4670551,-98.1926154 22.4652162,-98.1993548 22.4523753,-98.1998846 22.4490358,-98.1978326 22.4469295,-98.1934333 22.4449034,-98.1897432 22.4417905,-98.1891366 22.4399879,-98.1904532 22.4295637,-98.1889875 22.4253394,-98.185761 22.4228625,-98.1734576 22.4183489,-98.1660462 22.4110867,-98.1632872 22.4099848,-98.1575888 22.4105234,-98.1530001 22.4130739,-98.1515602 22.4129446,-98.1383794 22.4075596,-98.1258803 22.4001721,-98.1159052 22.3967697,-98.1135359 22.3953032,-98.11127 22.3920782,-98.1122634 22.3807383,-98.1118656 22.3781521,-98.1062131 22.3667123,-98.1051353 22.366023,-98.1024529 22.3666955,-98.1005877 22.3679647,-98.0979462 22.3715155,-98.0954936 22.3726944,-98.0882375 22.3712292,-98.0860153 22.3701536,-98.0791404 22.3583228,-98.0770982 22.3516407,-98.0757109 22.3492511,-98.0727814 22.3471614,-98.0708018 22.3469541,-98.0649517 22.3486412,-98.0605199 22.346542,-98.0594399 22.3465956,-98.0582561 22.3473175,-98.0554547 22.3543264,-98.0539604 22.3555401,-98.0493548 22.3563483,-98.0387244 22.3557642,-98.0349397 22.3562372,-98.0284721 22.358392,-98.0246149 22.356836,-98.0210744 22.3527835,-98.0194929 22.3522379,-98.0129014 22.3532795,-98.0062566 22.349893,-98.0007101 22.348157,-97.9962512 22.3484827,-97.9926975 22.3513328,-97.9900202 22.3508638,-97.9889188 22.3497756,-97.9864699 22.3426429,-97.9848493 22.3407997,-97.9775942 22.3390259,-97.9734601 22.333638,-97.9721017 22.3330079,-97.9685756 22.3329824,-97.9661246 22.3318971,-97.9646413 22.3299267,-97.9636741 22.3264806,-97.9626404 22.3258045,-97.9563154 22.3265756,-97.9500289 22.3232883,-97.9022264 22.3265344,-97.8943852 22.3244507,-97.8831674 22.322988,-97.8658122 22.3242296,-97.8644916 22.3215638,-97.8606407 22.3215608,-97.8555684 22.3219015,-97.8461367 22.3264804,-97.8447869 22.3224565,-97.8431724 22.3231926,-97.8351531 22.3231325,-97.8353054 22.3260886,-97.8196597 22.325789,-97.8310898 22.3581654,-97.8360966 22.3749863,-97.8448402 22.4082674,-97.8548842 22.4536814,-97.8578231 22.4734197,-97.8580679 22.4788914,-97.8573745 22.4814336,-97.8582725 22.484775,-97.8569328 22.4851553,-97.8578129 22.48967,-97.8587115 22.4900715,-97.8578693 22.4926835,-97.8503006 22.4929982,-97.8554338 22.5053711,-97.8570807 22.5118929,-97.8597863 22.5490016,-97.8657816 22.5519391,-97.8668794 22.5559056,-97.8720076 22.567705,-97.8720019 22.5714877,-97.8729913 22.5742684,-97.8745702 22.5721187,-97.8761277 22.568069,-97.8774858 22.5675543,-97.8763446 22.5627319,-97.8796329 22.563227,-97.8815506 22.5646438,-97.8860595 22.5632307,-97.8888136 22.5615875,-97.8894916 22.5619728,-97.891306 22.5680185,-97.8931656 22.5704879,-97.9009182 22.5710294,-97.9040695 22.5719708,-97.9073611 22.5766302,-97.9099174 22.5790446,-97.9096116 22.5850666,-97.9081139 22.5902838,-97.9089813 22.5927285,-97.9121576 22.5954826,-97.9123864 22.5966097,-97.9100295 22.6043862,-97.9089801 22.6129738,-97.9094377 22.6151807,-97.9134943 22.6188664,-97.9168612 22.6257179,-97.9171637 22.6275417,-97.9165428 22.6299763,-97.9139749 22.6342961,-97.9133088 22.6384347,-97.9153939 22.6442805,-97.9189426 22.6482715,-97.9209378 22.652458,-97.9222327 22.6529662,-97.9242992 22.6523705,-97.9264103 22.6499634,-97.9290592 22.6444288,-97.9295598 22.6411412,-97.9331921 22.6384033,-97.9347119 22.6385015,-97.9359637 22.6404785,-97.9357328 22.6416817,-97.9306824 22.6475337,-97.9296812 22.6499953,-97.9292486 22.6526957,-97.9298278 22.6556084,-97.9313701 22.6569117,-97.9341124 22.6569901,-97.9392668 22.6552334,-97.9434332 22.6513187,-97.9447925 22.6474508,-97.9461699 22.6454616,-97.9483309 22.6445649,-97.9594588 22.6453719,-97.9606269 22.6459672,-97.9610902 22.6475568,-97.9564364 22.6555603,-97.9561514 22.6580462,-97.9570672 22.6608795,-97.9592604 22.6629771,-97.9607651 22.6631019,-97.9630639 22.6621045,-97.9650822 22.6597218,-97.9692118 22.65136,-97.9708942 22.6509571,-97.9711701 22.6538569,-97.969676 22.6579429,-97.9687324 22.6654971,-97.9703489 22.6696512,-97.9719257 22.6706309,-97.973352 22.6705519,-97.9743729 22.6696181,-97.9746051 22.6682326,-97.9722357 22.6587766,-97.9742382 22.6539386,-97.9777951 22.6505901,-97.9804087 22.6503073,-97.9817002 22.6513145,-97.9821959 22.6526446,-97.9814596 22.6546042,-97.976235 22.6585466,-97.9753932 22.6609797,-97.9757886 22.6631866,-97.97975 22.6673255,-97.9834753 22.6691415,-97.9881703 22.6683821,-97.9907904 22.6661905,-97.9930669 22.662502,-97.9937854 22.6595391,-97.9954659 22.659344,-97.9996063 22.6607215,-98.0021696 22.6596492,-98.0030153 22.6587126,-98.003282 22.6523263,-98.0019174 22.6517856,-97.9996866 22.6524871,-97.999418 22.6506038,-98.0068283 22.6392188,-98.0099291 22.6328287,-98.0116338 22.6312871,-98.0131428 22.6308823,-98.0141448 22.6315307,-98.0135326 22.6334435,-98.0112208 22.6352234,-98.0114049 22.6366818,-98.0142112 22.6401369,-98.0158346 22.6407275,-98.0182426 22.6401383,-98.0214566 22.6375365,-98.0222757 22.6349865,-98.0232796 22.6346674,-98.0241015 22.6352763,-98.0251588 22.6380235,-98.0283566 22.6390648,-98.0308356 22.6426103,-98.0330898 22.642531,-98.0346004 22.6413555,-98.0570815 22.7520316,-98.0562309 22.7537917,-98.0494712 22.7998221,-98.088335 22.8044522,-98.0896814 22.7948986,-98.1102546 22.7976168,-98.1161359 22.7585366,-98.1620587 22.7431356,-98.2082417 22.7484573,-98.2176363 22.6791451,-98.2176166 22.6748147,-98.2144932 22.6710111,-98.2155216 22.6706453,-98.2172881 22.6728274,-98.2202672 22.6731524,-98.2197385 22.6749072,-98.2214309 22.6762962,-98.220226 22.6772042,-98.2214699 22.6785602,-98.2232321 22.6779011,-98.2279095 22.6792436,-98.2289132 22.6787277,-98.2290669 22.6776174,-98.2315549 22.6759504,-98.2335726 22.6770017,-98.2349838 22.6751359,-98.2372742 22.6758182,-98.24005 22.6740355,-98.2413059 22.6742079,-98.2418408 22.6729034,-98.2407029 22.6719705,-98.2413368 22.6712508,-98.2428029 22.6716534,-98.2433617 22.6729984,-98.2447981 22.6720582,-98.2517991 22.671487,-98.2611334 22.6806065,-98.2557722 22.7186513,-98.2657956 22.7197967,-98.264754 22.7283142,-98.2791903 22.7299842,-98.2755068 22.758281,-98.2892494 22.7709147,-98.2920532 22.7500622,-98.300908 22.7511572,-98.3047718 22.7221831,-98.3020435 22.71964,-98.3013499 22.7202616,-98.2993555 22.7184013,-98.2995365 22.7172073,-98.3017202 22.7193065,-98.3022801 22.7187735,-98.3031349 22.7195819,-98.3034246 22.7161369,-98.3053848 22.7179938,-98.3087993 22.6924543,-98.3039699 22.691843,-98.3093036 22.6515626,-98.3321286 22.653935,-98.3434849 22.5619062,-98.3221156 22.5596871,-98.3290092 22.5128194,-98.3163321 22.5111772,-98.3162374 22.5117168,-98.3078315 22.5100426,-98.3112901 22.5002836,-98.3065142 22.4992109,-98.3102441 22.4985604,-98.3094035 22.4937315,-98.307376 22.4940549,-98.3045411 22.4786312,-98.3003558 22.476698,-98.296577 22.4760021,-98.2952606 22.4749351,-98.2939658 22.4750672,-98.2942848 22.4736127,-98.2931459 22.4697148,-98.2916645 22.4677985)))') where nombre = 'altamira';
update municipio set poligono = ST_GeogFromText('MULTIPOLYGON(((-97.8555684 22.3219015,-97.8461367 22.3264804,-97.8447869 22.3224565,-97.8431724 22.3231926,-97.8351531 22.3231325,-97.8353054 22.3260886,-97.8196597 22.325789,-97.8145104 22.3128964,-97.807915 22.2997806,-97.801028 22.2885675,-97.7858232 22.2673817,-97.7835892 22.262617,-97.7924148 22.2603506,-97.8003411 22.2570014,-97.8116437 22.2517736,-97.8248153 22.244145,-97.8321125 22.2381027,-97.8363806 22.2301394,-97.83968 22.2314523,-97.839297 22.2323328,-97.8440312 22.234036,-97.8431093 22.2365424,-97.8467063 22.2375808,-97.845544 22.2401884,-97.8575371 22.2464993,-97.8579608 22.2552049,-97.8555927 22.2616975,-97.8576586 22.2621762,-97.8574284 22.2661778,-97.8594464 22.2668305,-97.8562842 22.275417,-97.8533004 22.2733035,-97.8523907 22.2730933,-97.8520725 22.2739267,-97.8531879 22.2747724,-97.8527187 22.2753565,-97.8570635 22.2811301,-97.8562751 22.2818612,-97.8539155 22.2813868,-97.8541859 22.2860034,-97.852994 22.2922216,-97.8502564 22.2995137,-97.8496518 22.3045342,-97.8486979 22.3062652,-97.8524089 22.3172976,-97.8555684 22.3219015)))') where nombre = 'madero';
update municipio set poligono = ST_GeogFromText('MULTIPOLYGON(((-97.8555684 22.3219015,-97.8644916 22.3215638,-97.8658122 22.3242296,-97.8831674 22.322988,-97.8943852 22.3244507,-97.9022264 22.3265344,-97.9500289 22.3232883,-97.9563154 22.3265756,-97.9626404 22.3258045,-97.9636741 22.3264806,-97.9646413 22.3299267,-97.9661246 22.3318971,-97.9699866 22.3330083,-97.9707701 22.3317386,-97.9705097 22.3280502,-97.9767583 22.3189172,-97.9787475 22.317309,-97.9791232 22.3131824,-97.9827859 22.3110529,-97.9824558 22.3093509,-97.9839799 22.3046712,-97.9852002 22.3058454,-97.9891332 22.3071602,-97.992272 22.3099624,-97.9953057 22.311265,-97.9954192 22.3136906,-97.9971541 22.3145157,-97.9989494 22.3143267,-97.9982571 22.3121445,-97.9988028 22.3048555,-97.998345 22.3030943,-97.9976466 22.3026784,-97.9984141 22.3008121,-97.9983266 22.2989873,-97.9994808 22.2993217,-98.000324 22.2974324,-97.9926641 22.2927747,-97.9901332 22.29687,-97.9876978 22.2994894,-97.9884287 22.3000342,-97.9869388 22.3016349,-97.9863191 22.3006302,-97.9830939 22.2989304,-97.9831512 22.3022576,-97.9827078 22.3026135,-97.9788026 22.3016156,-97.9714581 22.2961894,-97.9694655 22.2974064,-97.9666146 22.2954414,-97.9621062 22.2940805,-97.9585764 22.2945191,-97.9567076 22.2938923,-97.956179 22.290866,-97.9538629 22.2870419,-97.949368 22.2839388,-97.9485452 22.2825242,-97.9470673 22.2821307,-97.9424756 22.2772847,-97.9316606 22.2710465,-97.9311761 22.2695575,-97.9318201 22.2645406,-97.9327722 22.2625236,-97.9330123 22.2599122,-97.9354074 22.2564437,-97.9342126 22.2541816,-97.9324322 22.2536946,-97.9295287 22.2515748,-97.9256796 22.2506785,-97.9222641 22.2507071,-97.9191729 22.2515577,-97.9186252 22.2511442,-97.9184648 22.2522297,-97.9167904 22.252593,-97.9171764 22.2480245,-97.9202841 22.2460042,-97.9201476 22.2443114,-97.9181979 22.2420271,-97.9172818 22.2391305,-97.9042638 22.2346581,-97.9024188 22.2333434,-97.8978329 22.2297067,-97.8968063 22.2254744,-97.8949624 22.2223784,-97.8830743 22.2189945,-97.8701061 22.213415,-97.8602683 22.2100842,-97.8512886 22.2074895,-97.8448882 22.2069658,-97.8396832 22.2088862,-97.8376933 22.2124337,-97.8382138 22.2188726,-97.8363806 22.2301394,-97.83968 22.2314523,-97.839297 22.2323328,-97.8440312 22.234036,-97.8431093 22.2365424,-97.8467063 22.2375808,-97.845544 22.2401884,-97.8575371 22.2464993,-97.8579608 22.2552049,-97.8555927 22.2616975,-97.8576586 22.2621762,-97.8574284 22.2661778,-97.8594464 22.2668305,-97.8562842 22.275417,-97.8533004 22.2733035,-97.8523907 22.2730933,-97.8520725 22.2739267,-97.8531879 22.2747724,-97.8527187 22.2753565,-97.8570635 22.2811301,-97.8562751 22.2818612,-97.8539155 22.2813868,-97.8541859 22.2860034,-97.852994 22.2922216,-97.8502564 22.2995137,-97.8496518 22.3045342,-97.8486979 22.3062652,-97.8524089 22.3172976,-97.8555684 22.3219015)))') where nombre = 'tampico';
