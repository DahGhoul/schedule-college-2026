import { cn } from '@/lib/utilidades';

interface SeleccionTemporal {
  idComponente: number;
  idGrupo: number;
  nombreCurso: string;
  tipoComponente: string;
  diaSemana: string;
  horaInicio: string;
  codigoGrupo: string;
  codigoAmbiente: string;
  confirmado?: boolean;
  publicado?: boolean;
}

interface VistaHorarioDocenteProps {
  selecciones: SeleccionTemporal[];
  alQuitarCelda: (seleccion: SeleccionTemporal) => void;
}

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export function VistaHorarioDocente({ selecciones, alQuitarCelda }: VistaHorarioDocenteProps) {
  const obtenerSeleccion = (dia: string, hora: string) =>
    selecciones.find((s) => s.diaSemana === dia && s.horaInicio === hora);

  if (!selecciones.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 text-center text-sm text-gray-500 shadow-inner">
        Aún no tienes selecciones registradas en este período.
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span>{selecciones.length} bloque{selecciones.length === 1 ? '' : 's'} en total</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span> Borrador/Temporal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300"></span> Confirmado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600"></span> Publicado</span>
        </div>
      </div>
      <table className="min-w-full border-collapse border border-gray-200 text-xs shadow-sm rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="border-r border-gray-200 px-3 py-2 bg-gray-100 text-gray-600 font-semibold text-center w-20">Hora</th>
            {diasOrden.map((dia) => (
              <th key={dia} className="border-r border-gray-200 px-3 py-2 bg-gray-50 text-gray-600 font-semibold text-center">{dia.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {horas.map((hora) => (
            <tr key={hora} className="hover:bg-gray-50/30 transition-colors">
              <td className="border-r border-gray-200 px-3 py-2 text-center font-medium bg-gray-50/50 text-gray-500">{hora}</td>
              {diasOrden.map((dia) => {
                const sel = obtenerSeleccion(dia, hora);
                return (
                  <td
                    key={dia + hora}
                    className={cn(
                      'border-r border-gray-200 px-3 py-2 text-center transition-all duration-150',
                      sel ? (
                        sel.publicado
                          ? 'bg-blue-600 text-white cursor-not-allowed opacity-90 font-medium'
                          : sel.confirmado
                            ? 'bg-blue-50 border-2 border-blue-200 text-blue-800 hover:bg-blue-100 cursor-pointer font-medium hover:scale-[1.01] hover:shadow-sm'
                            : 'bg-yellow-50 border-2 border-yellow-200 text-yellow-800 hover:bg-yellow-100 cursor-pointer font-medium hover:scale-[1.01] hover:shadow-sm'
                      ) : 'text-gray-300'
                    )}
                    onClick={() => sel && !sel.publicado && alQuitarCelda(sel)}
                    title={sel ? (sel.publicado ? 'Bloque publicado (Bloqueado)' : sel.confirmado ? 'Bloque confirmado (Haz clic para quitar)' : 'Selección temporal (Haz clic para quitar)') : ''}
                  >
                    {sel ? (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="font-semibold">{sel.nombreCurso}</span>
                        <span className="text-[10px] opacity-90 mt-0.5">{sel.tipoComponente} • G{sel.codigoGrupo} • {sel.codigoAmbiente}</span>
                      </div>
                    ) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
