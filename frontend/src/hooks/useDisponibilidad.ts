'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useDisponibilidad(ambienteId: number | null, idPeriodo: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo],
    queryFn: () => horariosService.obtenerMatriz(ambienteId!, idPeriodo).then((res) => res.data),
    enabled: !!ambienteId && !!idPeriodo,
  });

  const actualizarMatriz = () => {
    queryClient.invalidateQueries({ queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo] });
  };

  return { ...query, actualizarMatriz };
}