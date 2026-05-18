import { apiClient } from '@/lib/api-client';

export const docentesService = {
  listar: (params?: any) => apiClient.get('/docentes', { params }),
  obtener: (id: number) => apiClient.get(`/docentes/${id}`),
  crear: (datos: any) => apiClient.post('/docentes', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/docentes/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/docentes/${id}`),
  buscar: (q: string) => apiClient.get('/docentes/buscar', { params: { q } }),
  obtenerDisponibilidad: (id: number) => apiClient.get(`/docentes/${id}/disponibilidad`),
  guardarDisponibilidad: (id: number, disponibilidad: any) =>
    apiClient.put(`/docentes/${id}/disponibilidad`, { disponibilidad }),
};