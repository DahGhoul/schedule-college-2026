import { z } from 'zod';

export const crearDocenteSchema = z.object({
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  email: z.string().email(),
  telefono: z.string().max(20).optional(),
  modalidad: z.enum(['NOMBRADO', 'CONTRATADO']),
  categoria: z.enum(['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA']),
  antiguedad: z.number().int().min(0).default(0),
  crear_usuario: z.boolean().default(false),
  password: z.string().min(6).optional(),
});

export const actualizarDocenteSchema = crearDocenteSchema.partial();