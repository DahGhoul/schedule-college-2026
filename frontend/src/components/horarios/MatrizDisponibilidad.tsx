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
  LIBRE: 'bg-emerald-50/40 hover:bg-emerald-100/70 border border-emerald-100 hover:border-emerald-300 transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm group relative',
  OCUPADO: 'bg-rose-50/60 border border-rose-100/80 text-rose-500/80 cursor-not-allowed',
  SELECCION_TEMPORAL: 'bg-amber-50 border-2 border-amber-300 text-amber-800 transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm relative shadow-sm',
  BLOQUEO_INSTITUCIONAL: 'bg-slate-50 border border-slate-200/60 text-slate-400/80 cursor-not-allowed',
};

export function MatrizDisponibilidad({ matriz, alHacerClickCelda }: MatrizProps) {
  if (!matriz) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center shadow-inner">
        <div className="rounded-full bg-gray-100 p-4 mb-3">
          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700">Por favor, seleccione un ambiente</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">Elige un aula o laboratorio del menú superior para visualizar su matriz de horarios.</p>
      </div>
    );
  }

  const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="border-r border-gray-200 px-4 py-3 font-semibold text-gray-500 text-center w-24">Hora</th>
              {dias.map((dia) => (
                <th key={dia} className="border-r border-gray-200 px-4 py-3 font-semibold text-gray-600 text-center uppercase tracking-wider">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {matriz.filas.map((fila) => (
              <tr key={fila.horaInicio} className="hover:bg-slate-50/30 transition-colors">
                <td className="border-r border-gray-200 px-4 py-3 text-center font-semibold bg-slate-50/50 text-gray-500 w-24">
                  {fila.horaInicio}
                </td>
                {fila.celdas.map((celda, idx) => (
                  <td
                    key={idx}
                    className={cn(
                      'border-r border-gray-200 px-2 py-3 text-center min-h-[44px]',
                      colores[celda.estado]
                    )}
                    onClick={() => alHacerClickCelda(celda.diaSemana, celda.horaInicio, celda.estado)}
                    title={`${celda.diaSemana} ${celda.horaInicio} - ${celda.estado}`}
                  >
                    <div className="flex items-center justify-center min-h-[20px] transition-all duration-150">
                      {celda.estado === 'LIBRE' && (
                        <span className="text-emerald-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          +
                        </span>
                      )}
                      {celda.estado === 'OCUPADO' && (
                        <span className="text-[10px] font-semibold text-rose-500 tracking-tight">
                          Ocupado
                        </span>
                      )}
                      {celda.estado === 'SELECCION_TEMPORAL' && (
                        <span className="text-[10px] font-bold text-amber-800 tracking-tight flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          Elegido
                        </span>
                      )}
                      {celda.estado === 'BLOQUEO_INSTITUCIONAL' && (
                        <span className="text-[10px] font-medium text-slate-400">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50/50 rounded-lg border border-gray-100">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200"></span>
          <span>Libre (Click para elegir)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-rose-50 border border-rose-100"></span>
          <span>Ocupado por otro curso</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-50 border-2 border-amber-300"></span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Mi Selección (Click para quitar)
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-50 border border-slate-200"></span>
          <span>Restricción institucional</span>
        </span>
      </div>
    </div>
  );
}