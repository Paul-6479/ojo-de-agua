-- Avisos de ejemplo para la demostración (semana 6/8).
-- Ojo: la `fuente` dice explícitamente que son de demostración. NUNCA cambiar
-- eso por «COMAPA» en datos inventados: sería atribuirle a COMAPA algo que no dijo.
-- Se puede volver a correr: borra los de demostración antes de insertarlos.
delete from aviso where fuente = 'Ojo de Agua (datos de demostración)';

insert into aviso (titulo, cuerpo, tipo, municipios, colonias, vigente_desde, vigente_hasta, fuente)
values
  (
    'Tandeo nocturno en la zona norte de Tampico',
    'El servicio se suspende de 22:00 a 5:00 mientras se repara la línea de conducción. Se recomienda almacenar agua durante la tarde.',
    'tandeo',
    '{tampico}',
    '{"Árbol Grande","Tancol","Smith"}',
    now() - interval '1 day',
    now() + interval '6 days',
    'Ojo de Agua (datos de demostración)'
  ),
  (
    'Corte programado por reparación de línea de 24 pulgadas',
    'Sin servicio de 8:00 a 18:00 del sábado. El restablecimiento puede tardar algunas horas más en las zonas altas.',
    'corte',
    '{madero,altamira}',
    '{"Unidad Nacional","Miramar"}',
    now() + interval '2 days',
    now() + interval '3 days',
    'Ojo de Agua (datos de demostración)'
  ),
  (
    'Baja presión en la zona centro por mantenimiento de rebombeo',
    'Durante el día puede haber presión baja en plantas altas. No es una fuga: no hace falta reportarlo.',
    'baja_presion',
    '{tampico}',
    '{}',
    now() - interval '2 hours',
    now() + interval '2 days',
    'Ojo de Agua (datos de demostración)'
  );
