import { apiClient } from '@/lib/api-client';

export type SeccionNoLectivaKey =
  | 'PREPARACION_EVALUACION'
  | 'CONSEJERIA_TUTORIA'
  | 'INVESTIGACION'
  | 'CAPACITACION'
  | 'ACTIVIDADES_GOBIERNO'
  | 'ACTIVIDADES_ADMINISTRACION'
  | 'ASESORIA_TESIS'
  | 'RESPONSABILIDAD_SOCIAL'
  | 'COMITES_COMISIONES';

export const cargaNoLectivaService = {
  obtenerMiDeclaracion: (idPeriodo: number) => apiClient.get(`/carga-no-lectiva/mi/${idPeriodo}`),
  guardarMiDeclaracion: (idPeriodo: number, datos: any) => apiClient.put(`/carga-no-lectiva/mi/${idPeriodo}`, datos),
  eliminarMiDeclaracion: (idPeriodo: number) => apiClient.delete(`/carga-no-lectiva/mi/${idPeriodo}`),
  obtenerMiHorarioNoLectivo: (idPeriodo: number) => apiClient.get(`/carga-no-lectiva/mi/${idPeriodo}/horario`),
  guardarMiHorarioNoLectivo: (idPeriodo: number, bloques: any[]) => apiClient.put(`/carga-no-lectiva/mi/${idPeriodo}/horario`, { bloques }),
};