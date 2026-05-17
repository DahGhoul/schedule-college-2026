import { apiClient } from '@/lib/api-client';

export const auditoriaService = {
  listar: (params?: any) => apiClient.get('/auditoria', { params }),
  obtenerPorHorario: (idHorario: number) => apiClient.get(`/auditoria/horario/${idHorario}`),
};