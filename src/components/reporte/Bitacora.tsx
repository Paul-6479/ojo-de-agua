import type { EventoPublico } from "@/lib/consultas";
import { CATALOGO_ESTATUS, ETIQUETA_ORIGEN, type EstatusReporte } from "@/lib/tipos";

function etiquetaEstatus(estatus: string | null) {
  if (!estatus) return "";
  return CATALOGO_ESTATUS[estatus as EstatusReporte]?.etiqueta ?? estatus;
}

function textoEvento(evento: EventoPublico) {
  switch (evento.tipo_evento) {
    case "creacion":
      return "Reporte recibido";
    case "confirmacion_afectado":
      return "Un vecino confirmó que también le afecta";
    case "confirmacion_resuelto":
      return "Un vecino indicó que ya fue reparado";
    default:
      if (evento.estatus_anterior && evento.estatus_nuevo) {
        return `Cambio de estatus: ${etiquetaEstatus(evento.estatus_anterior)} → ${etiquetaEstatus(evento.estatus_nuevo)}`;
      }
      if (evento.estatus_nuevo) return `Estatus: ${etiquetaEstatus(evento.estatus_nuevo)}`;
      return evento.tipo_evento.replaceAll("_", " ");
  }
}

function fechaLegible(fecha: string) {
  return new Date(fecha).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Monterrey",
  });
}

export default function Bitacora({ eventos }: { eventos: EventoPublico[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-sky-950">Historial</h2>
      {eventos.length === 0 && <p className="text-sm text-slate-600">Todavía no hay movimientos.</p>}
      <ol className="space-y-3 border-l-2 border-sky-200 pl-4">
        {eventos.map((evento, indice) => (
          <li key={`${evento.creado_en}-${indice}`} className="space-y-0.5">
            <p className="text-xs text-slate-500">{fechaLegible(evento.creado_en)}</p>
            <p className="font-semibold">{textoEvento(evento)}</p>
            {evento.nota && <p className="text-sm text-slate-700">{evento.nota}</p>}
            <p className="text-xs text-slate-500">{ETIQUETA_ORIGEN[evento.origen]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
