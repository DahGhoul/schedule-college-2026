'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useDisponibilidad(
  ambienteId: number | null,
  idPeriodo: number,
  docenteId?: number | null,
  componenteId?: number | null
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId, componenteId],
    queryFn: () =>
      horariosService
        .obtenerMatriz(ambienteId!, idPeriodo, docenteId || undefined, componenteId || undefined)
        .then((res) => res.data),
    enabled: !!ambienteId && !!idPeriodo,
  });

  const actualizarMatriz = () => {
    queryClient.invalidateQueries({
      queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId, componenteId],
    });
  };

  return { ...query, actualizarMatriz };
}