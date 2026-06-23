import { z } from 'zod';

export const crearCursoSchema = z.object({
  nombre: z.string().min(1).max(150),
  codigo: z.string().min(1).max(20),
  creditos: z.coerce.number().int().min(1).default(1),
  id_curricula: z.number().int().positive().nullable().optional(),
});

export const actualizarCursoSchema = crearCursoSchema.partial();
