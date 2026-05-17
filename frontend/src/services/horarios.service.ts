import { apiClient } from '@/lib/api-client';

export const horariosService = {
  obtenerMatriz: (ambienteId: number, idPeriodo: number) =>
    apiClient.get(`/horarios/disponibilidad-matriz/${ambienteId}`, { params: { idPeriodo } }),

  seleccionarCelda: (datos: any) => apiClient.post('/horarios/seleccionar-celda', datos),

  deseleccionarCelda: (datos: any) => apiClient.post('/horarios/deseleccionar-celda', datos),

  obtenerSeleccionesTemporales: (docenteId: number) =>
    apiClient.get(`/horarios/selecciones-temporales/${docenteId}`),

  validarSeleccion: (datos: any) => apiClient.post('/horarios/validar-seleccion', datos),

  obtenerProgreso: (docenteId: number) => apiClient.get(`/horarios/progreso/${docenteId}`),

  // Añadir estos métodos
    confirmarSeleccion: (datos: any) => apiClient.post('/horarios/confirmar-seleccion', datos),
    cambiarEstado: (datos: any) => apiClient.post('/horarios/cambiar-estado', datos),
    publicar: (idPeriodo: number) => apiClient.post('/horarios/publicar', { idPeriodo }),
    despublicar: (idPeriodo: number) => apiClient.post('/horarios/despublicar', { idPeriodo }),
    obtenerConflictos: (idPeriodo: number) => apiClient.get('/horarios/conflictos', { params: { idPeriodo } }),
    listarHorarios: (filtros?: any) => apiClient.get('/horarios', { params: filtros }),
};