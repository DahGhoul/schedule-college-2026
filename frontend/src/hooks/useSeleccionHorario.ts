'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useSeleccionHorario(docenteId: number) {
  const queryClient = useQueryClient();

  const seleccionesQuery = useQuery({
    queryKey: ['selecciones-temporales', docenteId],
    queryFn: () => horariosService.obtenerSeleccionesTemporales(docenteId).then((res) => res.data),
  });

  const seleccionarMutation = useMutation({
    mutationFn: (datos: any) => horariosService.seleccionarCelda(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
    },
  });

  const deseleccionarMutation = useMutation({
    mutationFn: (datos: any) => horariosService.deseleccionarCelda(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
    },
  });

  return {
    selecciones: seleccionesQuery.data || [],
    seleccionarCelda: seleccionarMutation.mutateAsync,
    deseleccionarCelda: deseleccionarMutation.mutateAsync,
  };
}