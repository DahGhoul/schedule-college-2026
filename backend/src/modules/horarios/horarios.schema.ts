import { z } from 'zod';

export const seleccionarCeldaSchema = z.object({
  idDocente: z.number().int().positive(),
  idCurso: z.number().int().positive(),
  idGrupo: z.number().int().positive().optional(),
  idAmbiente: z.number().int().positive(),
  modoPrueba: z.boolean().optional(),
  tipoClase: z.enum(['TEORIA', 'LABORATORIO']),
  diaSemana: z.enum(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  sesionId: z.string().min(1),
});

export const deseleccionarCeldaSchema = z.object({
  idDocente: z.number().int().positive(),
  idAmbiente: z.number().int().positive(),
  diaSemana: z.enum(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  sesionId: z.string().min(1),
});

export const validarSeleccionSchema = z.object({
  idDocente: z.number().int().positive(),
  idPeriodo: z.number().int().positive(),
});

// Añadir estos esquemas
export const confirmarSeleccionSchema = z.object({
  idDocente: z.number().int().positive(),
  idPeriodo: z.number().int().positive(),
});

export const publicarSchema = z.object({
  idPeriodo: z.number().int().positive(),
});

export const cambiarEstadoSchema = z.object({
  idHorario: z.number().int().positive(),
  nuevoEstado: z.enum(['BORRADOR', 'CONFIRMADO', 'PUBLICADO', 'CERRADO']),
});

export const generarHorariosSchema = z.object({
  idPeriodo: z.number().int().positive(),
  idCiclo: z.number().int().positive().optional(),
  modoPrueba: z.boolean().optional(),
  metodo: z.enum(['HEURISTICO', 'GENETICO']).optional(),
});