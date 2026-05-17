'use client';
import { cn } from '@/lib/utilidades';

interface MatrizProps {
  matriz: {
    ambienteId: number;
    ambienteCodigo: string;
    filas: {
      horaInicio: string;
      celdas: {
        diaSemana: string;
        horaInicio: string;
        estado: string;
      }[];
    }[];
  } | null;
  alHacerClickCelda: (dia: string, hora: string, estado: string) => void;
}

const colores: Record<string, string> = {
  LIBRE: 'bg-green-100 hover:bg-green-200 cursor-pointer',
  OCUPADO: 'bg-red-200',
  SELECCION_TEMPORAL: 'bg-yellow-200',
  BLOQUEO_INSTITUCIONAL: 'bg-gray-300',
};

export function MatrizDisponibilidad({ matriz, alHacerClickCelda }: MatrizProps) {
  if (!matriz) return <p className="text-center">Seleccione un ambiente</p>;

  const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1 bg-gray-100">Hora</th>
            {dias.map((dia) => (
              <th key={dia} className="border px-2 py-1 bg-gray-100">
                {dia.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.filas.map((fila) => (
            <tr key={fila.horaInicio}>
              <td className="border px-2 py-1 text-center font-medium">{fila.horaInicio}</td>
              {fila.celdas.map((celda, idx) => (
                <td
                  key={idx}
                  className={cn('border px-2 py-3 text-center', colores[celda.estado])}
                  onClick={() => alHacerClickCelda(celda.diaSemana, celda.horaInicio, celda.estado)}
                  title={`${celda.diaSemana} ${celda.horaInicio} - ${celda.estado}`}
                >
                  {/* vacío, el color lo dice todo */}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border"></span> Libre</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 border"></span> Ocupado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-200 border"></span> Temporal</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 border"></span> Bloqueo</span>
      </div>
    </div>
  );
}