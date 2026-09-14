import type { Metadata } from "next";
import Link from "next/link";
import PieDeslinde from "@/components/PieDeslinde";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Ojo de Agua",
};

// Aviso simplificado conforme a la Ley Federal de Protección de Datos
// Personales en Posesión de los Particulares (LFPDPPP) y los lineamientos del INAI.
export default function AvisoDePrivacidad() {
  return (
    <main className="flex min-h-dvh flex-col bg-sky-50 text-slate-950">
      <header className="bg-sky-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-lg font-bold">💧 Ojo de Agua</Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 leading-relaxed">
        <h1 className="text-2xl font-black text-sky-950">Aviso de privacidad</h1>
        <p className="text-sm text-slate-600">Última actualización: 14 de septiembre de 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Quién es responsable</h2>
          <p>
            Ojo de Agua es un proyecto ciudadano independiente desarrollado con fines académicos por
            un estudiante de la zona conurbada de Tampico. <strong>No es un canal oficial de COMAPA</strong> ni
            de ningún organismo público. El responsable del tratamiento de los datos es el autor del
            proyecto, con contacto en el repositorio público del sitio (ver «Contacto»).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Qué datos se recaban</h2>
          <p>Para reportar <strong>no se pide cuenta, nombre, CURP, INE, teléfono ni correo</strong>. Se guardan:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>La <strong>ubicación del problema</strong> que señalas en el mapa, con la precisión del GPS y si moviste el pin.</li>
            <li>El tipo de problema, la severidad, la descripción, la referencia y la colonia que escribas.</li>
            <li>Las <strong>fotos</strong> que decidas adjuntar. Antes de subirlas, tu propio teléfono las recomprime y les quita los metadatos (EXIF), incluidas las coordenadas GPS que traen las fotos de celular.</li>
            <li>Un <strong>identificador anónimo de tu navegador</strong>: una clave aleatoria que se genera en tu dispositivo y de la que el servidor guarda solo un resumen criptográfico (SHA-256). No se vincula a tu identidad.</li>
            <li>Tu <strong>dirección IP</strong> durante diez minutos, únicamente para limitar el número de envíos y frenar el spam.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Para qué se usan</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Mostrar el reporte en el mapa público y en su ficha, con su historial.</li>
            <li>Detectar reportes repetidos del mismo problema y contar cuántos vecinos lo confirman.</li>
            <li>Evitar envíos automatizados o abusivos.</li>
            <li>Elaborar estadísticas agregadas (por colonia, tipo y tiempo sin atención) que no identifican a nadie.</li>
          </ul>
          <p>No se usan para publicidad, no se venden y no se comparten con terceros, salvo requerimiento legal.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Qué se publica y qué no</h2>
          <p>
            En el mapa y en las fichas la <strong>ubicación se redondea a unos 25 metros</strong>; la coordenada
            exacta no se expone al público. Nunca se muestra nombre, contacto ni domicilio de quien
            reporta. Las fotos pasan por revisión antes de aparecer y se retiran las que muestren
            personas identificables, placas o interiores de viviendas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Dónde se guardan</h2>
          <p>
            Los datos se almacenan en servicios de nube de terceros con los que el proyecto tiene
            contrato de uso: Supabase (base de datos y fotos) y Vercel (servidor del sitio). Los mapas
            se cargan desde MapTiler, que recibe la petición de las teselas como cualquier sitio de mapas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Tus derechos (ARCO)</h2>
          <p>
            Puedes solicitar el <strong>acceso, rectificación, cancelación u oposición</strong> respecto a
            los datos de un reporte, así como el <strong>retiro de una foto</strong> de tu propiedad o en la que
            aparezcas. Indica el folio del reporte (por ejemplo <code>OJO-2026-0042</code>) y qué necesitas.
            Se atiende en un plazo máximo de 20 días hábiles.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Contacto</h2>
          <p>
            Abre un <em>issue</em> en{" "}
            <a className="underline" href="https://github.com/Paul-6479/ojo-de-agua/issues" rel="noopener noreferrer" target="_blank">
              github.com/Paul-6479/ojo-de-agua
            </a>
            . Si prefieres un medio privado, indícalo ahí y se te dará un correo de contacto.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-950">Cambios a este aviso</h2>
          <p>
            Cualquier cambio se publicará en esta misma página con su fecha. Si el proyecto pasa a
            operar con público general o en convenio con alguna dependencia, este aviso se
            actualizará antes de que eso ocurra.
          </p>
        </section>

        <Link href="/" className="block text-center text-sm font-semibold text-sky-800 underline">Volver al mapa</Link>
      </article>

      <PieDeslinde />
    </main>
  );
}
