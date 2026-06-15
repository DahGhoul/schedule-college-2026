import { apiClient } from '@/lib/api-client';

export const periodosService = {
  listar: () => apiClient.get('/periodos'),
  obtener: (id: number) => apiClient.get(`/periodos/${id}`),
  crear: (datos: any) => apiClient.post('/periodos', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/periodos/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/periodos/${id}`),
  activo: () => apiClient.get('/periodos/activo'),
  obtenerCiclosPorPeriodo: (id: number) => apiClient.get(`/periodos/${id}/ciclos`),
  obtenerCiclosActivo: () => apiClient.get('/periodos/activo/ciclos'),
};