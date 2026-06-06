import { z } from 'zod';

export const restriccionesSchema = z.object({
  FRANJA_INICIO: z.string().regex(/^\d{2}:\d{2}$/),
  FRANJA_FIN: z.string().regex(/^\d{2}:\d{2}$/),
  HORAS_MAX_DIARIAS: z.coerce.number().int().min(1).max(16),
  BLOQUEO_ALMUERZO_INICIO: z.string().regex(/^\d{2}:\d{2}$/),
  BLOQUEO_ALMUERZO_FIN: z.string().regex(/^\d{2}:\d{2}$/),
  TIEMPO_ATENCION_VENTANA: z.string().transform(Number).pipe(z.number().int().min(1).max(60)),
});

export const diaNoLaborableSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descripcion: z.string().min(1).max(200),
  tipo: z.enum(['FERIADO', 'MANTENIMIENTO']),
});

export const actualizarDiaNoLaborableSchema = diaNoLaborableSchema.partial();