'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { ventanasService } from '@/services/ventanas.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Calendar, Zap, List } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function ConfigurarVentanasPage() {
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: ventanasExistentes } = useQuery({
    queryKey: ['ventanas', idPeriodo],
    queryFn: () => ventanasService.listar(idPeriodo!).then((res) => res.data),
    enabled: !!idPeriodo,
  });

  const generarMutation = useMutation({
    mutationFn: () => ventanasService.generarAutomatica({ idPeriodo: idPeriodo!, fechaInicio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas', idPeriodo] });
    },
  });

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Programación de Ventanas de Atención</h1>
        <p className="text-gray-500 text-sm">Establece los turnos automáticos de 30 minutos para la elección de horarios por parte de los docentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" /> Generación Automática
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Selector
              label="Seleccionar Período"
              value={idPeriodo?.toString() || ''}
              onChange={(e) => setIdPeriodo(parseInt(e.target.value))}
            >
              <option value="">Seleccionar período</option>
              {periodos?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Selector>

            <CampoTexto
              label="Fecha de Inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />

            <Boton 
              className="w-full" 
              onClick={() => generarMutation.mutate()} 
              disabled={!idPeriodo || generarMutation.isPending}
            >
              {generarMutation.isPending ? 'Generando...' : 'Generar Ventanas (30 min)'}
            </Boton>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-blue-500" /> Turnos Programados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!idPeriodo ? (
              <p className="text-center py-10 text-gray-400 italic">Seleccione un periodo para ver la programación</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-2">Orden</th>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Horario</th>
                      <th className="px-4 py-2">Prioridad (Cat/Mod)</th>
                      <th className="px-4 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ventanasExistentes?.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">#{v.orden}</td>
                        <td className="px-4 py-2">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{v.hora_inicio} - {v.hora_fin}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className="font-bold">{v.categoria}</span><br/>
                          <span className="text-gray-500">{v.modalidad}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
                            v.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {v.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ventanasExistentes?.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No hay ventanas programadas para este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {generarMutation.isSuccess && <NotificacionToast mensaje="Ventanas generadas correctamente" tipo="success" />}
      {generarMutation.isError && <NotificacionToast mensaje="Error al generar ventanas" tipo="error" />}
    </div>
  );
}
