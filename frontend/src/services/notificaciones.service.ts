import { apiClient } from '@/lib/api-client';

export const notificacionesService = {
  obtenerPreferencias: (docenteId: number) =>
    apiClient.get(`/notificaciones/preferencias/${docenteId}`),
  actualizarPreferencias: (docenteId: number, datos: any) =>
    apiClient.put(`/notificaciones/preferencias/${docenteId}`, datos),
  verificarWhatsApp: (idDocente: number, codigo: string) =>
    apiClient.post('/notificaciones/verificar-whatsapp', { idDocente, codigo }),
  vincularTelegram: (idDocente: number, telegramId: string) =>
    apiClient.post('/notificaciones/vincular-telegram', { idDocente, telegramId }),
  enviar: (datos: any) => apiClient.post('/notificaciones/enviar', datos),
  historial: (params?: any) => apiClient.get('/notificaciones/historial', { params }),
};