# Guion de la presentación

Diez minutos, en vivo, desde el teléfono y la laptop. El objetivo **no** es
enseñar código: es que se entienda el problema, que la propuesta de valor se vea
funcionando y que quede claro qué parte es real y qué parte es simulación.

## Antes de entrar al salón (lista de verificación)

1. **Despertar Supabase.** El proyecto del plan gratuito se pausa tras ~1 semana
   sin actividad. Entrar a supabase.com, abrir el proyecto y esperar a que
   termine de reactivarse. **Hacerlo el día anterior, no cinco minutos antes.**
2. Abrir `https://ojo-de-agua-ruby.vercel.app` y comprobar:
   - la portada muestra cifras (no las de ejemplo — si dice «datos de ejemplo»,
     la base no está respondiendo);
   - el mapa pinta pines;
   - `/avisos` muestra al menos un aviso vigente (si no, correr
     `db/semilla-avisos.sql`, que usa fechas relativas a `now()`).
3. Entrar al panel con el usuario de prueba y comprobar que la bandeja carga.
4. Tener **dos pestañas ya abiertas**: la portada y el panel. Cambiar de pestaña
   es más rápido y menos riesgoso que escribir una URL en vivo.
5. Datos móviles como respaldo del wifi del salón. Si nada de eso funciona,
   tener grabado un video de 60 segundos del flujo de reporte.
6. Llevar una foto de una fuga ya en la galería del teléfono, por si no hay
   ninguna a la mano para el reporte en vivo.

## Minuto a minuto

**0:00 – 1:30 · El problema, con un hecho, no con una opinión.**
Abrir la portada. Leer en voz alta la cifra grande de litros perdidos y la de
reportes que llevan más de una semana sin atención. Decir de dónde sale cada una
y decir explícitamente que la de litros es una estimación con un supuesto
declarado. *La honestidad de esa cifra es parte de la propuesta, no una
advertencia legal.*

**1:30 – 4:00 · El reporte, en vivo, desde el teléfono.**
Reportar un problema real ahí mismo: ubicación, tipo, foto, enviar. Cronometrarlo
en voz alta. Los tres puntos que hay que decir mientras se hace:
- **sin cuenta y sin CURP** — cualquier fricción mata la adopción;
- el pin se arrastra porque el GPS urbano se equivoca 20 a 50 metros;
- la foto se comprime y **se le borran las coordenadas** en el teléfono, antes
  de subirla.
Al terminar, mostrar el folio y buscarlo en `/seguir` desde la laptop.

**4:00 – 5:30 · Por qué un mapa público cambia algo.**
Mostrar la ficha del reporte: la bitácora, el contador de vecinos afectados y la
línea «Reportado hace N días · sin atención confirmada». Explicar que un reporte
suelto se pierde en una llamada, y que cien reportes con fecha y con vecinos
confirmando son un hecho difícil de ignorar.

**5:30 – 8:00 · La fase B: el panel de COMAPA.**
Decir la frase completa antes de abrirlo: **«esto es una simulación; COMAPA no
participa todavía»**. Entonces cambiar el estatus del reporte que se acaba de
crear, escribir una nota, comprometer una fecha, subir la foto del trabajo
terminado y cerrarlo. Volver a la ficha pública y mostrar cómo ahora dice «según
COMAPA» y aparece la fecha comprometida.
Cerrar con el argumento de negociación: **los avisos de corte y tandeo**. Abrir
`/panel/avisos`, publicar uno y mostrarlo en la portada. Esa es la función que le
ahorra llamadas al conmutador a COMAPA, y por eso es la carta para conseguir la
reunión.

**8:00 – 9:00 · Lo que falta y lo que puede salir mal.**
No esconderlo, presentarlo como plan:
- el riesgo dominante es la **adopción**, no lo técnico: un mapa vacío no
  convence a nadie; el plan es cargar 30–50 problemas reales fotografiados y
  difundir por la sociedad de alumnos y grupos vecinales;
- el tiempo estimado de resolución solo será real con convenio;
- moderación y antispam están puestos pero no endurecidos, porque todavía no hay
  público.

**9:00 – 10:00 · Cierre.**
La frase de cierre: *«Ojo de Agua no repara fugas. Hace imposible ignorarlas.»*

## Preguntas que van a hacer, y la respuesta corta

| Pregunta | Respuesta |
|---|---|
| ¿No es ilegal usar el nombre de COMAPA? | No se usa. El pie de cada página dice que es un proyecto ciudadano independiente y que no es un canal oficial. No se usa su logo ni su nombre como propios. |
| ¿Qué pasa si alguien reporta fugas falsas? | Hay honeypot, límite de tasa por dispositivo e IP, y límite geográfico: fuera de la conurbación el reporte se marca solo. Las fotos entran a cola de aprobación. La moderación es posterior, a propósito: exigir cuenta mataría el proyecto. |
| ¿De dónde salen los litros perdidos? | De una tabla de tasas supuestas por tipo y gravedad, multiplicada por el tiempo abierto. Se muestra el supuesto junto a la cifra. No es una medición. |
| ¿Y la privacidad de quien reporta? | Nunca se publica nombre ni contacto; la ubicación pública se redondea a ~25 m; a las fotos se les quita el EXIF en el teléfono. Hay aviso de privacidad y un contacto para bajar fotos. |
| ¿Cuánto cuesta operarlo? | Cero hoy: capas gratuitas de Supabase, Vercel y MapTiler. Se eligieron MapLibre y MapTiler justamente para no exponerse a un cobro por carga de mapa. |
| ¿Quién lo mantiene si pasa la materia? | Es una pregunta abierta y honesta. La respuesta realista es que necesita un convenio o un grupo que lo adopte. |

## Lo que NO conviene hacer en vivo

- **No** improvisar una consulta SQL ni abrir el panel de Supabase.
- **No** prometer que COMAPA va a usarlo.
- **No** enseñar código, salvo que lo pidan.
- **No** cambiar el estatus a «en proceso» para que se vea bonito y luego
  explicar que era mentira: la etiqueta de fuente es el argumento más fuerte del
  proyecto, no romperla.
