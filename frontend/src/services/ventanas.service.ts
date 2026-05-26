import { apiClient } from '@/lib/api-client';

export const ventanasService = {
  generarAutomatica: (datos: { idPeriodo: number; fechaInicio: string }) =>
    apiClient.post('/ventanas/generar-automatica', datos),
  configurar: (datos: any) => apiClient.post('/ventanas/configurar', datos),
  generarHorario: (datos: { idPeriodo: number; fechaInicio: string; fechaFin: string; horaInicio: string; horaFin: string }) =>
    apiClient.post('/ventanas/generar-horario', datos),
  actualizarHorario: (datos: { idPeriodo: number; fechaInicio: string; fechaFin: string; horaInicio: string; horaFin: string }) =>
    apiClient.post('/ventanas/actualizar-horario', datos),
  actualizarTurno: (datos: { idVentana: number; idDocente: number; fecha: string; horaInicio: string; horaFin: string }) =>
    apiClient.post('/ventanas/actualizar-turno', datos),
  desactivarTurno: (datos: { idVentana: number; idDocente: number }) =>
    apiClient.post('/ventanas/desactivar-turno', datos),
  desactivar: (idPeriodo: number) => apiClient.post('/ventanas/desactivar', { idPeriodo }),
  enviarCorreos: (idPeriodo: number) => apiClient.post('/ventanas/enviar-correos', { idPeriodo }),
  listar: (periodo?: number) => apiClient.get('/ventanas', { params: { periodo } }),
  obtenerActiva: (periodo?: number) => apiClient.get('/ventanas/activa', { params: { periodo } }),
  miTurno: (idPeriodo: number) => apiClient.get('/ventanas/mi-turno', { params: { idPeriodo } }),
  obtener: (id: number) => apiClient.get(`/ventanas/${id}`),
  iniciar: (id: number) => apiClient.post(`/ventanas/${id}/iniciar`),
  obtenerCola: (id: number) => apiClient.get(`/ventanas/${id}/cola`),
  siguienteDocente: (id: number) => apiClient.post(`/ventanas/${id}/siguiente-docente`),
  marcarAtendido: (id: number, idDocente: number) =>
    apiClient.post(`/ventanas/${id}/marcar-atendido`, { idDocente }),
};