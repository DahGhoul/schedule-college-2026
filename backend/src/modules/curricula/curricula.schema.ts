import { z } from 'zod';

export const crearCurriculaSchema = z.object({
  codigo: z.string().min(1).max(20),
  nombre: z.string().min(1).max(200),
  vigente: z.boolean().default(false),
});

export const actualizarCurriculaSchema = crearCurriculaSchema.partial();
