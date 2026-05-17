'use client';
import { useQuery } from '@tanstack/react-query';
import { estadisticasService } from '@/services/estadisticas.service';

export function useResumen(idPeriodo: number) {
  return useQuery({
    queryKey: ['estadisticas-resumen', idPeriodo],
    queryFn: () => estadisticasService.resumen(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });
}

export function useAvanceCategoria(idPeriodo: number) {
  return useQuery({
    queryKey: ['estadisticas-avance-categoria', idPeriodo],
    queryFn: () => estadisticasService.avanceCategoria(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });
}

export function useOcupacionAmbientes(idPeriodo: number) {
  return useQuery({
    queryKey: ['estadisticas-ocupacion-ambientes', idPeriodo],
    queryFn: () => estadisticasService.ocupacionAmbientes(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });
}

export function useMapaCalor(idPeriodo: number) {
  return useQuery({
    queryKey: ['estadisticas-mapa-calor', idPeriodo],
    queryFn: () => estadisticasService.mapaCalor(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });
}

export function useCargaDocente(idPeriodo: number) {
  return useQuery({
    queryKey: ['estadisticas-carga-docente', idPeriodo],
    queryFn: () => estadisticasService.cargaDocente(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });
}