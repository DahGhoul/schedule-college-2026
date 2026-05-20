'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { periodosService } from '@/services/periodos.service';
import { ventanasService } from '@/services/ventanas.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const formatearFecha = (fecha?: string | Date) => {
  if (!fecha) return '';
  const f = new Date(fecha);
  // Usamos métodos UTC para evitar desfases de zona horaria en fechas de solo día
  const y = f.getUTCFullYear();
  const m = String(f.getUTCMonth() + 1).padStart(2, '0');
  const d = String(f.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function CrearVentanaSecretariaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos-ventanas-crear'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo-ventanas-crear'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: ventanaActiva } = useQuery({
    queryKey: ['ventana-activa-crear', idPeriodo],
    queryFn: () => ventanasService.obtenerActiva(idPeriodo as number).then((res) => res.data),
    enabled: !!idPeriodo,
  });

  useEffect(() => {
    if (!idPeriodo && periodoActivo?.id) {
      setIdPeriodo(periodoActivo.id);
    }
    if (periodoActivo && !fechaInicio) {
      setFechaInicio(formatearFecha(periodoActivo.fecha_inicio));
    }
    if (periodoActivo && !fechaFin) {
      setFechaFin(formatearFecha(periodoActivo.fecha_fin));
    }
    if (!idPeriodo && !periodoActivo?.id && (periodos || []).length > 0) {
      setIdPeriodo(periodos[0].id);
    }
  }, [idPeriodo, periodoActivo, fechaInicio, fechaFin, periodos]);

  const crearMutation = useMutation({
    mutationFn: () =>
      ventanasService.generarHorario({
        idPeriodo: idPeriodo as number,
        fechaInicio,
        fechaFin,
        horaInicio,
        horaFin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas-secretaria', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['ventana-activa-crear', idPeriodo] });
      router.replace('/dashboard/secretaria/ventanas');
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al generar horario', tipo: 'error' });
    },
  });

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear ventana de atencion</h1>
        <p className="text-sm text-gray-500">Define el periodo y las horas diarias para generar la ventana.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parametros de atencion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              Periodo
              <Selector
                label=""
                opciones={[
                  { valor: '', etiqueta: 'Seleccionar periodo' },
                  ...(periodos || []).map((p: any) => ({ valor: String(p.id), etiqueta: p.nombre })),
                ]}
                value={idPeriodo?.toString() || ''}
                onChange={(e) => setIdPeriodo(e.target.value ? parseInt(e.target.value, 10) : null)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Fecha inicio de ventanas
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Fecha max de atencion
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Hora inicio por dia
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Hora fin por dia
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {ventanaActiva && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Ya existe una ventana activa o pendiente para este periodo. No se puede generar una nueva.
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <Boton
              onClick={() => crearMutation.mutate()}
              disabled={
                !idPeriodo ||
                !fechaInicio ||
                !fechaFin ||
                !horaInicio ||
                !horaFin ||
                crearMutation.isPending ||
                !!ventanaActiva
              }
            >
              {crearMutation.isPending ? 'Generando...' : 'Crear ventana'}
            </Boton>
            <Boton variante="secundario" onClick={() => router.back()}>
              Cancelar
            </Boton>
          </div>
        </CardContent>
      </Card>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
