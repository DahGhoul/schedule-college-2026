import { apiClient } from '@/lib/api-client';

export const cursosService = {
  listar: (params?: { buscar?: string; id_curricula?: number }) => apiClient.get('/cursos', { params }),
  obtener: (id: number) => apiClient.get(`/cursos/${id}`),
  crear: (datos: any) => apiClient.post('/cursos', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/cursos/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/cursos/${id}`),
};
