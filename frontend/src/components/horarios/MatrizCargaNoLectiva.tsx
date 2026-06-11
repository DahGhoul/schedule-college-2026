'use client';
import { cn } from '@/lib/utilidades';

interface MatrizProps {
  matriz: {
    filas: {
      horaInicio: string;
      celdas: {
        diaSemana: string;
        horaInicio: string;
        estado: 'LIBRE' | 'LECTIVO' | 'NO_LECTIVO' | 'BLOQUEO_ALMUERZO';
        info?: {
          origen?: string;
          seccion?: string;
        };
      }[];
    }[];
  };
  alHacerClickCelda: (dia: string, hora: string) => void;
  bloqueado?: boolean;
}

const colores: Record<string, string> = {
  LIBRE: 'bg-emerald-50/40 hover:bg-emerald-100/70 border border-emerald-100 hover:border-emerald-300 transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm group relative',
  LECTIVO: 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed',
  NO_LECTIVO: 'bg-indigo-50 border-2 border-indigo-300 text-indigo-800 transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm relative shadow-sm',
  BLOQUEO_ALMUERZO: 'bg-slate-50 border border-slate-200/60 text-slate-400/80 cursor-not-allowed',
};

export function MatrizCargaNoLectiva({ matriz, alHacerClickCelda, bloqueado = false }: MatrizProps) {
  const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="border-r border-gray-200 px-4 py-3 font-semibold text-gray-500 text-center w-32">Hora</th>
              {dias.map((dia) => (
                <th key={dia} className="border-r border-gray-200 px-4 py-3 font-semibold text-gray-600 text-center uppercase tracking-wider">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {matriz.filas.map((fila) => {
              const horaFin = `${(parseInt(fila.horaInicio.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
              return (
                <tr key={fila.horaInicio} className="hover:bg-slate-50/30 transition-colors">
                  <td className="border-r border-gray-200 px-4 py-3 text-center font-semibold bg-slate-50/50 text-gray-500 w-32">
                    {fila.horaInicio} - {horaFin}
                  </td>
                  {fila.celdas.map((celda, idx) => {
                    const estadoVisible = celda.estado;
                    return (
                      <td
                        key={idx}
                        className={cn(
                          'border-r border-gray-200 px-1 py-1.5 text-center min-w-[130px] min-h-[55px] transition-all',
                          colores[estadoVisible],
                          bloqueado && estadoVisible !== 'BLOQUEO_ALMUERZO' && estadoVisible !== 'LECTIVO' && 'cursor-not-allowed opacity-70'
                        )}
                        onClick={() => {
                          if (bloqueado || estadoVisible === 'LECTIVO' || estadoVisible === 'BLOQUEO_ALMUERZO') return;
                          alHacerClickCelda(celda.diaSemana, celda.horaInicio);
                        }}
                      >
                        <div className="flex items-center justify-center min-h-[36px] transition-all duration-150">
                          {estadoVisible === 'LIBRE' && (
                            <span className="text-emerald-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              + Asignar
                            </span>
                          )}
                          {estadoVisible === 'LECTIVO' && (
                            <div className="flex flex-col items-center justify-center p-0.5">
                              <span className="text-[10px] font-semibold text-slate-500 tracking-tight">
                                Clases
                              </span>
                              {celda.info?.origen && (
                                <span className="text-[8px] text-slate-400 font-medium truncate max-w-[110px]" title={celda.info.origen}>
                                  {celda.info.origen}
                                </span>
                              )}
                            </div>
                          )}
                          {estadoVisible === 'NO_LECTIVO' && (
                            <div className="flex flex-col items-center justify-center p-1 text-center w-full min-h-[40px]">
                              <span className="text-[10px] font-bold text-indigo-900 leading-tight truncate max-w-[110px] whitespace-pre-wrap" title={celda.info?.seccion}>
                                {celda.info?.seccion?.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                          {estadoVisible === 'BLOQUEO_ALMUERZO' && (
                            <span className="text-[10px] font-medium text-slate-400">
                              Almuerzo
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50/50 rounded-xl border border-gray-150">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200"></span>
          <span>Libre</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></span>
          <span>Horas de Clase (Lectivo)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-indigo-50 border-2 border-indigo-300"></span>
          <span>Horas No Lectivas asignadas</span>
        </span>
      </div>
    </div>
  );
}
