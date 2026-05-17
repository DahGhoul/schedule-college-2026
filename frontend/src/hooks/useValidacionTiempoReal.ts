'use client';
import { useQuery } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useValidacionTiempoReal(docenteId: number, idPeriodo: number) {
  return useQuery({
    queryKey: ['validacion-seleccion', docenteId, idPeriodo],
    queryFn: () =>
      horariosService.validarSeleccion({ idDocente: docenteId, idPeriodo }).then((res) => res.data),
    enabled: !!docenteId && !!idPeriodo,
    refetchInterval: 2000, // Refrescar cada 2 segundos
  });
}