import { cn } from '@/lib/utilidades';

interface SeleccionTemporal {
  idCurso: number;
  nombreCurso: string;
  tipoClase: string;
  diaSemana: string;
  horaInicio: string;
  codigoAmbiente: string;
}

interface VistaHorarioDocenteProps {
  selecciones: SeleccionTemporal[];
  alQuitarCelda: (dia: string, hora: string) => void;
}

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export function VistaHorarioDocente({ selecciones, alQuitarCelda }: VistaHorarioDocenteProps) {
  const obtenerSeleccion = (dia: string, hora: string) =>
    selecciones.find((s) => s.diaSemana === dia && s.horaInicio === hora);

  return (
    <div className="overflow-x-auto">
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
                    onClick={() => sel && alQuitarCelda(dia, hora)}
                  >
                    {sel ? `${sel.nombreCurso} (${sel.tipoClase[0]}) ${sel.codigoAmbiente}` : ''}
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