import { z } from 'zod';

const diaSemanaSchema = z.enum(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);

export const disponibilidadDocenteSchema = z.object({
  disponibilidad: z.array(
    z.object({
      diaSemana: diaSemanaSchema,
      horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
      horaFin: z.string().regex(/^\d{2}:\d{2}$/),
      disponible: z.boolean().default(true),
    })
  ).min(1),
});

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