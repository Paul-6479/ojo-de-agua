-- Datos de ejemplo para la demostración (semana 3).
-- Idempotente: borra todo lo marcado con hash_reportante = 'semilla' y lo vuelve a insertar.
-- Los reportes quedan con es_ejemplo = true y la interfaz los etiqueta como tales.
-- El folio lo asigna el trigger de reporte; no se fija a mano.
-- Generado a partir de src/lib/datosEjemplo.ts: si cambias uno, cambia el otro.

begin;

delete from confirmacion where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from foto where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from evento_reporte where reporte_id in (select id from reporte where hash_reportante = 'semilla');
delete from reporte where hash_reportante = 'semilla';

-- Tabla temporal con los datos; el orden (n) sirve para asignar confirmaciones.
create temp table semilla (
  n integer, tipo tipo_problema, severidad severidad, descripcion text,
  latitud double precision, longitud double precision, referencia text, colonia text,
  municipio municipio_nombre, estatus estatus_reporte, origen origen_estatus, dias integer
) on commit drop;

insert into semilla values
  (1, 'fuga_calle', 'alta', 'Se está haciendo un charco grande desde temprano.', 22.2167, -97.8585, 'Frente a la plaza', 'Centro', 'tampico', 'recibido', 'ciudadano', 2),
  (2, 'sin_agua', 'media', 'Desde anoche no sale ni una gota.', 22.2382, -97.8738, 'Cerca del mercado', 'Guadalupe', 'tampico', 'validado', 'moderador', 5),
  (3, 'baja_presion', 'media', 'En el segundo piso ya no sube el agua.', 22.2498, -97.8774, 'Sobre avenida Hidalgo', 'Petrolera', 'tampico', 'en_cola', 'comunidad', 9),
  (4, 'drenaje', 'alta', 'La alcantarilla se regresa cuando llueve.', 22.2648, -97.8842, 'Esquina con calle Fresno', 'Del Bosque', 'tampico', 'en_proceso', 'comapa', 12),
  (5, 'fuga_domicilio', 'baja', 'Fuga constante en la toma de la banqueta.', 22.2718, -97.8681, 'A media cuadra del parque', 'Lomas de Rosales', 'tampico', 'resuelto', 'comunidad', 16),
  (6, 'agua_sucia', 'media', 'El agua salió amarillenta esta mañana.', 22.2456, -97.8539, 'Por la iglesia', 'Águila', 'tampico', 'recibido', 'ciudadano', 3),
  (7, 'alcantarilla', 'alta', 'La tapa está rota y es peligroso de noche.', 22.2294, -97.8506, 'Frente a la primaria', 'Arenal', 'tampico', 'reabierto', 'comunidad', 23),
  (8, 'fuga_calle', 'media', 'Corre agua limpia por toda la calle.', 22.2078, -97.8696, 'Junto a la cancha', 'Morelos', 'tampico', 'cerrado', 'comunidad', 31),
  (9, 'fuga_calle', 'alta', 'Sale agua con fuerza del pavimento.', 22.2463, -97.8354, 'Cerca de la presidencia', 'Centro', 'madero', 'recibido', 'ciudadano', 1),
  (10, 'sin_agua', 'alta', 'Toda la cuadra amaneció sin servicio.', 22.2664, -97.8433, 'Entre Guerrero y Durango', 'Unidad Nacional', 'madero', 'validado', 'moderador', 7),
  (11, 'baja_presion', 'media', 'Solo hay agua de madrugada y con poca fuerza.', 22.2805, -97.8288, 'Cerca de la avenida principal', 'Miramar', 'madero', 'en_cola', 'comunidad', 14),
  (12, 'drenaje', 'alta', 'Hay olor fuerte y el registro está lleno.', 22.2588, -97.8229, 'Una cuadra antes del mercado', 'Árbol Grande', 'madero', 'en_proceso', 'comapa', 20),
  (13, 'hidrante', 'baja', 'El hidrante gotea todo el día.', 22.2397, -97.8169, 'A un lado de la unidad deportiva', 'Primero de Mayo', 'madero', 'resuelto', 'comunidad', 35),
  (14, 'agua_sucia', 'media', 'Agua con tierra después del corte de ayer.', 22.3946, -97.9382, 'Por la plaza', 'Centro', 'altamira', 'recibido', 'ciudadano', 4),
  (15, 'sin_agua', 'alta', 'Ya van dos días sin agua en las casas.', 22.4157, -97.9101, 'Cerca de la carretera', 'Miramar sector norte', 'altamira', 'derivado', 'moderador', 28),
  (16, 'fuga_calle', 'media', 'Fuga pequeña, pero no deja de correr.', 22.3674, -97.9188, 'Frente a la tienda', 'Laguna de la Puerta', 'altamira', 'rechazado', 'moderador', 45);

insert into reporte (tipo, severidad, descripcion, latitud, longitud, referencia, colonia, municipio,
  estatus, origen_estatus, hash_reportante, visible, es_ejemplo, creado_en, cerrado_en)
select tipo, severidad, descripcion, latitud, longitud, referencia, colonia, municipio,
  estatus, origen, 'semilla', true, true,
  now() - make_interval(days => dias),
  case when estatus in ('resuelto', 'cerrado') then now() - make_interval(days => greatest(dias - 2, 0)) else null end
from semilla
order by n;
-- La ubicación (PostGIS) la completa el trigger antes_de_completar_ubicacion.

-- Bitácora: evento de creación para todos…
insert into evento_reporte (reporte_id, tipo_evento, estatus_nuevo, origen, creado_en)
select r.id, 'creacion', 'recibido', 'ciudadano', r.creado_en
from reporte r where r.hash_reportante = 'semilla';

-- …y un cambio de estatus para los que no siguen en 'recibido'.
insert into evento_reporte (reporte_id, tipo_evento, estatus_anterior, estatus_nuevo, origen, nota, creado_en)
select r.id, 'cambio_estatus', 'recibido', r.estatus, r.origen_estatus,
  case r.estatus
    when 'rechazado' then 'Fuera de la zona conurbada'
    when 'derivado' then 'Corresponde a otra dependencia'
    else null end,
  r.creado_en + interval '1 day'
from reporte r where r.hash_reportante = 'semilla' and r.estatus <> 'recibido';

-- Algunas confirmaciones de vecinos, con identificadores ficticios.
insert into confirmacion (reporte_id, identificador, tipo, creado_en)
select r.id, 'semilla-' || g, 'afectado', r.creado_en + make_interval(hours => 6 * g)
from reporte r
join semilla s on s.latitud = r.latitud and s.longitud = r.longitud
cross join generate_series(1, 3) g
where r.hash_reportante = 'semilla' and g <= (s.n % 4);

insert into evento_reporte (reporte_id, tipo_evento, origen, creado_en)
select reporte_id, 'confirmacion_afectado', 'comunidad', creado_en
from confirmacion where identificador like 'semilla-%';

commit;
