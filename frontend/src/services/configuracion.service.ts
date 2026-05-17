import { apiClient } from '@/lib/api-client';

export const configuracionService = {
  obtenerRestricciones: () => apiClient.get('/configuracion/restricciones'),
  actualizarRestricciones: (datos: any) => apiClient.put('/configuracion/restricciones', datos),

  listarDiasNoLaborables: (anio?: number) =>
    apiClient.get('/configuracion/dias-no-laborables', { params: { anio } }),
  crearDiaNoLaborable: (datos: any) => apiClient.post('/configuracion/dias-no-laborables', datos),
  actualizarDiaNoLaborable: (id: number, datos: any) =>
    apiClient.put(`/configuracion/dias-no-laborables/${id}`, datos),
  eliminarDiaNoLaborable: (id: number) =>
    apiClient.delete(`/configuracion/dias-no-laborables/${id}`),
};