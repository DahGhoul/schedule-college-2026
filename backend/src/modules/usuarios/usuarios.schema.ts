import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  email: z.string().email(),
  rol: z.enum(['ADMINISTRADOR', 'DOCENTE', 'COORDINADOR']),
  password: z.string().min(6),
  id_docente: z.number().int().optional(),
});

export const actualizarUsuarioSchema = z.object({
  email: z.string().email().optional(),
  rol: z.enum(['ADMINISTRADOR', 'DOCENTE', 'COORDINADOR']).optional(),
  password: z.string().min(6).optional(),
  id_docente: z.number().int().nullable().optional(),
  activo: z.boolean().optional(),
});
