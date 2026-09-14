"use client";

import { CATALOGO_TIPOS, type EstatusReporte, type TipoProblema } from "@/lib/tipos";

export type FiltroEstatus = "todos" | "abiertos" | "resueltos";
export type FiltroTipo = "todos" | TipoProblema;

type FiltrosProps = {
  estatusSeleccionado: FiltroEstatus;
  tipoSeleccionado: FiltroTipo;
  alCambiarEstatus: (estatus: FiltroEstatus) => void;
  alCambiarTipo: (tipo: FiltroTipo) => void;
};

const ESTATUS_ABIERTOS: EstatusReporte[] = [
  "recibido",
  "validado",
  "en_cola",
  "en_proceso",
  "reabierto",
];

export function esEstatusAbierto(estatus: EstatusReporte) {
  return ESTATUS_ABIERTOS.includes(estatus);
}

const OPCIONES_ESTATUS: Array<{ valor: FiltroEstatus; etiqueta: string }> = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "abiertos", etiqueta: "Abiertos" },
  { valor: "resueltos", etiqueta: "Resueltos" },
];

const TIPOS = Object.keys(CATALOGO_TIPOS) as TipoProblema[];

// Chip redondo, grande para el pulgar. `activo` cambia el color.
function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colores = activo ? "bg-blue-700 text-white" : "bg-sky-100 text-sky-950";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${colores}`}
    >
      {children}
    </button>
  );
}

export default function Filtros({
  estatusSeleccionado,
  tipoSeleccionado,
  alCambiarEstatus,
  alCambiarTipo,
}: FiltrosProps) {
  return (
    <section
      className="border-b border-sky-100 bg-white px-3 py-2 shadow-sm"
      aria-label="Filtros de reportes"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {OPCIONES_ESTATUS.map((opcion) => (
          <Chip
            key={opcion.valor}
            activo={estatusSeleccionado === opcion.valor}
            onClick={() => alCambiarEstatus(opcion.valor)}
          >
            {opcion.etiqueta}
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <Chip activo={tipoSeleccionado === "todos"} onClick={() => alCambiarTipo("todos")}>
          Todos los tipos
        </Chip>
        {TIPOS.map((tipo) => (
          <Chip
            key={tipo}
            activo={tipoSeleccionado === tipo}
            onClick={() => alCambiarTipo(tipo)}
          >
            {CATALOGO_TIPOS[tipo].emoji} {CATALOGO_TIPOS[tipo].etiqueta}
          </Chip>
        ))}
      </div>
    </section>
  );
}
