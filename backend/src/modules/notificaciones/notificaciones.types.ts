export interface PreferenciasNotificacion {
  id: number;
  idDocente: number;
  correoHabilitado: boolean;
  whatsappHabilitado: boolean;
  telegramHabilitado: boolean;
  whatsappVerificado: boolean;
  telegramId?: string | null;
}

export interface NotificacionEnvio {
  idDocente: number;
  canal: 'CORREO' | 'WHATSAPP' | 'TELEGRAM';
  tipoMensaje: 'RECORDATORIO_24H' | 'ALERTA_15MIN' | 'PERSONALIZADO';
  contenido: string;
}

export interface HistorialNotificacion {
  id: number;
  idDocente: number;
  canal: string;
  tipoMensaje: string;
  estadoEnvio: string;
  fechaEnvio: Date;
  contenido?: string;
  reintentos: number;
}