'use client';
import { useQuery } from '@tanstack/react-query';
import { notificacionesService } from '@/services/notificaciones.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

interface HistorialNotificacionesProps {
  docenteId?: number;
}

export function HistorialNotificaciones({ docenteId }: HistorialNotificacionesProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['historial-notificaciones', docenteId],
    queryFn: () =>
      notificacionesService.historial({ idDocente: docenteId }).then((r) => r.data),
  });

  if (isLoading) return <SpinnerCarga />;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Historial de Notificaciones</h3>
      {data?.registros?.length > 0 ? (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Canal</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.registros.map((h: any) => (
              <tr key={h.id} className="border-t">
                <td className="px-4 py-2">{new Date(h.fecha_envio).toLocaleString()}</td>
                <td className="px-4 py-2">{h.canal}</td>
                <td className="px-4 py-2">{h.tipo_mensaje}</td>
                <td className="px-4 py-2">{h.estado_envio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No hay notificaciones registradas.</p>
      )}
    </div>
  );
}