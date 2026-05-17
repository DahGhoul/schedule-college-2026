'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { ventanasService } from '@/services/ventanas.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function ConfigurarVentanasPage() {
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const configurarMutation = useMutation({
    mutationFn: () => {
      const dias = [
        {
          fecha: '2026-06-08',
          categorias: [
            { categoria: 'PRINCIPAL', modalidad: 'NOMBRADO', hora_inicio: '08:00', hora_fin: '09:30', orden: 1 },
            { categoria: 'ASOCIADO', modalidad: 'NOMBRADO', hora_inicio: '09:30', hora_fin: '11:00', orden: 2 },
            { categoria: 'AUXILIAR', modalidad: 'NOMBRADO', hora_inicio: '11:00', hora_fin: '12:30', orden: 3 },
            { categoria: 'JEFE_PRACTICA', modalidad: 'NOMBRADO', hora_inicio: '12:30', hora_fin: '13:00', orden: 4 },
          ],
        },
        {
          fecha: '2026-06-09',
          categorias: [
            { categoria: 'PRINCIPAL', modalidad: 'CONTRATADO', hora_inicio: '08:00', hora_fin: '09:30', orden: 1 },
            { categoria: 'ASOCIADO', modalidad: 'CONTRATADO', hora_inicio: '09:30', hora_fin: '11:00', orden: 2 },
            { categoria: 'AUXILIAR', modalidad: 'CONTRATADO', hora_inicio: '11:00', hora_fin: '12:30', orden: 3 },
            { categoria: 'JEFE_PRACTICA', modalidad: 'CONTRATADO', hora_inicio: '12:30', hora_fin: '13:00', orden: 4 },
          ],
        },
      ];
      return ventanasService.configurar({ idPeriodo: idPeriodo!, dias });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ventanas', idPeriodo] }),
  });

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Configuración de Ventanas</h1>
      <div className="flex gap-4 mb-4 items-end">
        <Selector
          label="Período"
          opciones={[
            { valor: '', etiqueta: 'Seleccionar período' },
            ...(periodos?.map((p: any) => ({ valor: p.id.toString(), etiqueta: p.nombre })) || []),
          ]}
          value={idPeriodo?.toString() || ''}
          onChange={(e) => setIdPeriodo(parseInt(e.target.value))}
        />
        <Boton onClick={() => configurarMutation.mutate()} disabled={!idPeriodo}>
          Generar Configuración Predeterminada
        </Boton>
      </div>
      {configurarMutation.isSuccess && <NotificacionToast mensaje="Ventanas configuradas" tipo="exito" />}
      {configurarMutation.isError && <NotificacionToast mensaje="Error al configurar" tipo="error" />}
    </div>
  );
}