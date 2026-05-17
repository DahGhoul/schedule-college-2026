import { z } from 'zod';

export const crearAmbienteSchema = z.object({
  codigo: z.string().min(1).max(20),
  tipo: z.enum(['AULA', 'LABORATORIO']),
  capacidad: z.number().int().min(1).default(40),
  piso: z.number().int().optional(),
  equipamiento: z.string().optional(),
});

export const actualizarAmbienteSchema = crearAmbienteSchema.partial();

export const registroMantenimientoSchema = z.object({
  fecha_inicio: z.string().datetime(),
  fecha_fin: z.string().datetime(),
  descripcion: z.string().optional(),
});