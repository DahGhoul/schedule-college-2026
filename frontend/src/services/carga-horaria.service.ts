import { apiClient } from '@/lib/api-client';

export const cargaHorariaService = {
  asignarCarga: (datos: {
    id_componente: number;
    id_docente: number;
    horas_asignadas: number;
  }) => apiClient.post('/carga-horaria/asignar', datos),

  obtenerResumen: (idPeriodo: number) => 
    apiClient.get(`/carga-horaria/resumen/${idPeriodo}`),

  configurarOferta: (datos: any) => 
    apiClient.post('/carga-horaria/configurar-oferta', datos),

  eliminarAsignacion: (idAsignacion: number) =>
    apiClient.delete(`/carga-horaria/asignacion/${idAsignacion}`),

  eliminarOferta: (id: number) =>
    apiClient.delete(`/carga-horaria/oferta/${id}`),

  actualizarAsignacion: (idAsignacion: number, datos: any) =>
    apiClient.put(`/carga-horaria/asignacion/${idAsignacion}`, datos),

  obtenerCiclos: (idPeriodo: number) =>
    apiClient.get(`/carga-horaria/ciclos/${idPeriodo}`),

  obtenerCursosPorCiclo: (idPeriodo: number, idCiclo?: number) => {
    const params = idCiclo ? { id_ciclo: idCiclo } : {};
    return apiClient.get(`/carga-horaria/cursos/${idPeriodo}`, { params });
  },
};
