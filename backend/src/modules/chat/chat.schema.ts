import { z } from 'zod';

export const consultaSchema = z.object({
  consulta: z.string().min(1),
  rol: z.string().optional(),
  contexto: z.string().optional(),
});
