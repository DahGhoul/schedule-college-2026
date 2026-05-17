import { z } from 'zod';

export const actualizarPreferenciasSchema = z.object({
  correoHabilitado: z.boolean().optional(),
  whatsappHabilitado: z.boolean().optional(),
  telegramHabilitado: z.boolean().optional(),
});

export const enviarNotificacionSchema = z.object({
  idDocente: z.number().int().positive(),
  canal: z.enum(['CORREO', 'WHATSAPP', 'TELEGRAM']),
  tipoMensaje: z.enum(['RECORDATORIO_24H', 'ALERTA_15MIN', 'PERSONALIZADO']),
  contenido: z.string().min(1),
});

export const verificarWhatsAppSchema = z.object({
  idDocente: z.number().int().positive(),
  codigo: z.string().length(6),
});