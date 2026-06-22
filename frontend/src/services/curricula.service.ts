import { apiClient } from '@/lib/api-client';

export const curriculaService = {
  listar: (params?: any) => apiClient.get('/curricula', { params }),
  obtener: (id: number) => apiClient.get(`/curricula/${id}`),
  obtenerVigente: () => apiClient.get('/curricula/vigente'),
  crear: (datos: any) => apiClient.post('/curricula', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/curricula/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/curricula/${id}`),
};
