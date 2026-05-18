'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disponibilidadService, type Disponibilidad } from '@/services/disponibilidad.service';
import { useAuthStore } from '@/stores/auth.store';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

export default function DisponibilidadPage() {
  const usuario = useAuthStore(state => state.usuario);
  const queryClient = useQueryClient();
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: disponibilidadData, isLoading } = useQuery({
    queryKey: ['disponibilidad', usuario?.idDocente],
    queryFn: () => usuario?.idDocente ? disponibilidadService.obtenerPorDocente(usuario.idDocente) : Promise.resolve([]),
    enabled: !!usuario?.idDocente,
  });

  useEffect(() => {
    if (disponibilidadData) {
      setDisponibilidades(disponibilidadData);
    }
  }, [disponibilidadData]);

  const actualizarMutation = useMutation({
    mutationFn: (datos: { id: number; disponible: boolean }[]) => 
      usuario?.idDocente ? disponibilidadService.actualizarBatch(usuario.idDocente, datos) : Promise.resolve([]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad'] });
      setToast({ mensaje: 'Disponibilidad actualizada exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al actualizar disponibilidad', tipo: 'error' });
    },
  });

  const toggleDisponibilidad = (id: number) => {
    setDisponibilidades(prev =>
      prev.map(d => d.id === id ? { ...d, disponible: !d.disponible } : d)
    );
  };

  const guardarCambios = () => {
    const cambios = disponibilidades.map(d => ({ id: d.id, disponible: d.disponible }));
    actualizarMutation.mutate(cambios);
  };

  const horasUnicas = [...new Set(disponibilidades.map(d => d.hora_inicio))].sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <SpinnerCarga />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Mi Disponibilidad</h1>
          <p className="text-sm text-gray-500">Marca las horas en las que estás disponible para enseñar.</p>
        </div>
        <Boton onClick={guardarCambios} disabled={actualizarMutation.isPending}>
          {actualizarMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Boton>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 w-24">
                    Hora
                  </th>
                  {diasOrden.map(dia => (
                    <th key={dia} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
                      {dia.charAt(0) + dia.slice(1).toLowerCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horasUnicas.map(horaInicio => (
                  <tr key={horaInicio} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
                      {horaInicio}
                    </td>
                    {diasOrden.map(dia => {
                      const disp = disponibilidades.find(
                        d => d.dia_semana === dia && d.hora_inicio === horaInicio
                      );
                      if (!disp) return null;

                      return (
                        <td key={`${dia}-${horaInicio}`} className="px-2 py-2 text-center border-b border-gray-100">
                          <button
                            onClick={() => toggleDisponibilidad(disp.id)}
                            className={`w-full h-12 rounded-lg transition-all duration-200 border-2 ${
                              disp.disponible
                                ? 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 text-emerald-800'
                                : 'bg-red-100 border-red-300 hover:bg-red-200 text-red-800'
                            }`}
                          >
                            {disp.disponible ? '✓' : '✗'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border-2 border-emerald-300"></div>
              <span className="text-sm text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
              <span className="text-sm text-gray-600">No disponible</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {toast && (
        <NotificacionToast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
