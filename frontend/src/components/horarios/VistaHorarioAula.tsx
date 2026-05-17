'use client';
import { cn } from '@/lib/utilidades';

interface HorarioAula {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  curso: { nombre: string; codigo: string } | null;
  docente: { nombres: string; apellidos: string } | null;
  tipo_clase: string;
  estado: string;
}

interface VistaHorarioAulaProps {
  horarios: HorarioAula[];
}

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const horas = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

export function VistaHorarioAula({ horarios }: VistaHorarioAulaProps) {
  const obtenerHorario = (dia: string, hora: string) =>
    horarios.find((h) => h.dia_semana === dia && h.hora_inicio === hora);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th className="border px-2 py-1 bg-gray-100">Hora</th>
            {diasOrden.map((dia) => (
              <th key={dia} className="border px-2 py-1 bg-gray-100">
                {dia.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((hora) => (
            <tr key={hora}>
              <td className="border px-2 py-1 text-center font-medium">{hora}</td>
              {diasOrden.map((dia) => {
                const h = obtenerHorario(dia, hora);
                return (
                  <td
                    key={dia + hora}
                    className={cn(
                      'border px-2 py-1 text-center',
                      h ? 'bg-blue-100' : ''
                    )}
                  >
                    {h && (
                      <div>
                        <p className="font-semibold">{h.curso?.nombre || 'Sin curso'}</p>
                        <p className="text-gray-600">
                          {h.docente?.nombres} {h.docente?.apellidos}
                        </p>
                        <p className="italic text-gray-500">{h.tipo_clase}</p>
                      </div>
                    )}
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