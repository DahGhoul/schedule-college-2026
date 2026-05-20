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
}

interface VistaHorarioDocenteProps {
  selecciones: SeleccionTemporal[];
  alQuitarCelda: (seleccion: SeleccionTemporal) => void;
}

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export function VistaHorarioDocente({ selecciones, alQuitarCelda }: VistaHorarioDocenteProps) {
  const obtenerSeleccion = (dia: string, hora: string) =>
    selecciones.find((s) => s.diaSemana === dia && s.horaInicio === hora);

  if (!selecciones.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        Aún no tienes selecciones temporales registradas.
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="text-sm text-gray-600">
        {selecciones.length} bloque{selecciones.length === 1 ? '' : 's'} seleccionado{selecciones.length === 1 ? '' : 's'}.
      </div>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th className="border px-2 py-1 bg-gray-100">Hora</th>
            {diasOrden.map((dia) => (
              <th key={dia} className="border px-2 py-1 bg-gray-100">{dia.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((hora) => (
            <tr key={hora}>
              <td className="border px-2 py-1 text-center">{hora}</td>
              {diasOrden.map((dia) => {
                const sel = obtenerSeleccion(dia, hora);
                return (
                  <td
                    key={dia + hora}
                    className={cn(
                      'border px-2 py-1 text-center',
                      sel ? 'bg-yellow-200 cursor-pointer' : ''
                    )}
                    onClick={() => sel && alQuitarCelda(sel)}
                  >
                    {sel ? `${sel.nombreCurso} (${sel.tipoComponente[0]}) G${sel.codigoGrupo} ${sel.codigoAmbiente}` : ''}
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
