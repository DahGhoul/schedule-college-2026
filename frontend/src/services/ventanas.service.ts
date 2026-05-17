import { apiClient } from '@/lib/api-client';

export const ventanasService = {
  configurar: (datos: any) => apiClient.post('/ventanas/configurar', datos),
  listar: (periodo?: number) => apiClient.get('/ventanas', { params: { periodo } }),
  obtenerActiva: (periodo?: number) => apiClient.get('/ventanas/activa', { params: { periodo } }),
  obtener: (id: number) => apiClient.get(`/ventanas/${id}`),
  iniciar: (id: number) => apiClient.post(`/ventanas/${id}/iniciar`),
  obtenerCola: (id: number) => apiClient.get(`/ventanas/${id}/cola`),
  siguienteDocente: (id: number) => apiClient.post(`/ventanas/${id}/siguiente-docente`),
  marcarAtendido: (id: number, idDocente: number) =>
    apiClient.post(`/ventanas/${id}/marcar-atendido`, { idDocente }),
};