import { apiClient } from '@/lib/api-client';

export const estadisticasService = {
  resumen: (idPeriodo: number) =>
    apiClient.get('/estadisticas/resumen', { params: { idPeriodo } }),
  avanceCategoria: (idPeriodo: number) =>
    apiClient.get('/estadisticas/avance-categoria', { params: { idPeriodo } }),
  ocupacionAmbientes: (idPeriodo: number) =>
    apiClient.get('/estadisticas/ocupacion-ambientes', { params: { idPeriodo } }),
  mapaCalor: (idPeriodo: number) =>
    apiClient.get('/estadisticas/mapa-calor', { params: { idPeriodo } }),
  cargaDocente: (idPeriodo: number) =>
    apiClient.get('/estadisticas/carga-docente', { params: { idPeriodo } }),
};