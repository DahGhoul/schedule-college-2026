import { apiClient } from '@/lib/api-client';

export const gruposService = {
  listar: (params?: any) => apiClient.get('/grupos', { params }),
  obtener: (id: number) => apiClient.get(`/grupos/${id}`),
  crear: (datos: any) => apiClient.post('/grupos', datos),
  crearPorCurso: (cursoId: number, datos: any) => apiClient.post(`/grupos/por-curso/${cursoId}`, datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/grupos/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/grupos/${id}`),
  listarPorCurso: (cursoId: number) => apiClient.get(`/grupos/por-curso/${cursoId}`),
};
