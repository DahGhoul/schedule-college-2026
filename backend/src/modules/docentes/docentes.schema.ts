import { z } from 'zod';

export const dedicacionesDocente = [
  'TIEMPO_COMPLETO_40H',
  'DEDICACION_EXCLUSIVA_40H',
  'TIEMPO_PARCIAL_20H',
  'TIEMPO_PARCIAL_16H',
  'TIEMPO_PARCIAL_12H',
  'TIEMPO_PARCIAL_10H',
  'TIEMPO_PARCIAL_8H',
] as const;

const baseDocenteSchema = z.object({
  codigo_ibm: z.string().max(20).optional(),
  dni: z.string().max(20).optional(),

  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),

  email: z.string().email(),

  empleo: z.string().max(150).optional(),
  telefono: z.string().max(20).optional(),

  modalidad: z.enum(['NOMBRADO', 'CONTRATADO']),

  categoria: z.enum([
    'PRINCIPAL',
    'ASOCIADO',
    'AUXILIAR',
    'JEFE_PRACTICA',
  ]),

  dedicacion: z.enum(dedicacionesDocente).default('TIEMPO_COMPLETO_40H'),

  antiguedad: z.number().int().min(0).default(0),

  horas_max_semana: z.number().int().positive().optional(),

  id_sede_principal: z.number().int().positive().optional(),

  crear_usuario: z.boolean().default(false),

  password: z.string().optional(),
});

export const crearDocenteSchema = baseDocenteSchema.superRefine(
  (data, ctx) => {
    if (
      data.crear_usuario &&
      data.password &&
      data.password.length < 6
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 6,
        type: 'string',
        inclusive: true,
        message: 'La contraseña debe tener mínimo 6 caracteres',
        path: ['password'],
      });
    }
  }
);

export const actualizarDocenteSchema =
  baseDocenteSchema.partial();

export const disponibilidadDocenteSchema = z.object({
  disponibilidad: z.array(
    z.object({
      diaSemana: z.enum([
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
      ]),
      horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
      horaFin: z.string().regex(/^\d{2}:\d{2}$/),
      disponible: z.boolean().default(true),
    })
  ),
});