import { z } from 'zod';

export const crearPeriodoSchema = z.object({
  nombre: z.string().min(1).max(20),
  tipo: z.enum(['I', 'II', 'III']),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const actualizarPeriodoSchema = crearPeriodoSchema.partial().extend({
  activo: z.boolean().optional(),
  estado: z.enum(['BORRADOR', 'ACTIVO', 'CERRADO']).optional(),
});