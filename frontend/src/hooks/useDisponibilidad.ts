'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useDisponibilidad(ambienteId: number | null, idPeriodo: number, docenteId?: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId],
    queryFn: () => horariosService.obtenerMatriz(ambienteId!, idPeriodo, docenteId || undefined).then((res) => res.data),
    enabled: !!ambienteId && !!idPeriodo,
  });

  const actualizarMatriz = () => {
    queryClient.invalidateQueries({ queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId] });
  };

  return { ...query, actualizarMatriz };
}