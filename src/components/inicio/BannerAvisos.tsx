import Link from "next/link";
import { CATALOGO_AVISOS, vigenciaLegible, zonaLegible, type AvisoPublico } from "@/lib/avisos";

// Los avisos van arriba de todo: quien entra porque no le llega el agua quiere
// saber si es un corte programado antes que ver un mapa.
export default function BannerAvisos({ avisos }: { avisos: AvisoPublico[] }) {
  if (avisos.length === 0) return null;

  const principal = avisos[0];
  const info = CATALOGO_AVISOS[principal.tipo] ?? CATALOGO_AVISOS.informativo;

  return (
    <section className="px-4 py-3" style={{ backgroundColor: info.color }}>
      <div className="mx-auto max-w-6xl text-white">
        <p className="text-sm font-black uppercase tracking-wide">
          {info.emoji} {info.etiqueta}
        </p>
        <p className="text-lg font-bold leading-tight">{principal.titulo}</p>
        <p className="text-sm text-white/90">{principal.cuerpo}</p>
        <p className="mt-1 text-xs text-white/80">
          {zonaLegible(principal)} · {vigenciaLegible(principal)} · Fuente: {principal.fuente}
        </p>
        {avisos.length > 1 && (
          <Link href="/avisos" className="mt-2 inline-block text-sm font-bold underline">
            Ver los otros {avisos.length - 1} avisos vigentes
          </Link>
        )}
      </div>
    </section>
  );
}
