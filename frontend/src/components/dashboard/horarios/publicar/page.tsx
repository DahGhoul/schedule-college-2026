'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { horariosService } from '@/services/horarios.service';
import { Boton } from '@/components/ui/Boton';
import { VisorConflictos } from '@/components/horarios/VisorConflictos';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function PublicarPage() {
  const queryClient = useQueryClient();

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const publicarMutation = useMutation({
    mutationFn: () => horariosService.publicar(periodoActivo.id),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const despublicarMutation = useMutation({
    mutationFn: () => horariosService.despublicar(periodoActivo.id),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Publicar Horarios</h1>

      {periodoActivo && <VisorConflictos idPeriodo={periodoActivo.id} />}

      <div className="flex gap-4">
        <Boton onClick={() => publicarMutation.mutate()} disabled={publicarMutation.isPending}>
          Publicar Horarios
        </Boton>
        <Boton variante="peligro" onClick={() => despublicarMutation.mutate()} disabled={despublicarMutation.isPending}>
          Despublicar
        </Boton>
      </div>

      {publicarMutation.isSuccess && <NotificacionToast mensaje="Horarios publicados" tipo="exito" />}
      {despublicarMutation.isSuccess && <NotificacionToast mensaje="Horarios despublicados" tipo="exito" />}
      {(publicarMutation.isError || despublicarMutation.isError) && (
        <NotificacionToast mensaje="Error en la operación" tipo="error" />
      )}
    </div>
  );
}