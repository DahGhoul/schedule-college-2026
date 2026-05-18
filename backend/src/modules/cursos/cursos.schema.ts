import { z } from 'zod';

export const crearCursoSchema = z.object({
  nombre: z.string().min(1).max(150),
  codigo: z.string().min(1).max(20),
  horas_teoria: z.number().int().min(0).default(0),
  horas_practica: z.number().int().min(0).default(0),
  horas_laboratorio: z.number().int().min(0).default(0),
  creditos: z.number().int().min(1).default(1),
});

export const actualizarCursoSchema = crearCursoSchema.partial();

export const asignarAmbienteSchema = z.object({
  id_ambiente: z.number().int().positive(),
  tipo_clase: z.enum(['TEORIA', 'PRACTICA', 'LABORATORIO']),
});