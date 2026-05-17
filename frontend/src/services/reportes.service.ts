import { apiClient } from '@/lib/api-client';

export const reportesService = {
  generar: (datos: { tipo: string; [key: string]: any }) =>
    apiClient.post('/reportes/generar', datos),
  estado: (jobId: string) => apiClient.get(`/reportes/estado/${jobId}`),
  descargar: (jobId: string) =>
    apiClient.get(`/reportes/descargar/${jobId}`, { responseType: 'blob' }),
};