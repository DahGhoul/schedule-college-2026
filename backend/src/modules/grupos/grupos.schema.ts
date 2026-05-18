import { z } from 'zod';

export const crearGrupoSchema = z.object({
  id_curso: z.number().int().positive(),
  codigo_grupo: z.string().min(1).max(5),
  capacidad_maxima: z.number().int().min(1).default(40),
});

export const actualizarGrupoSchema = z.object({
  codigo_grupo: z.string().min(1).max(5).optional(),
  capacidad_maxima: z.number().int().min(1).optional(),
});

export const crearGrupoPorCursoSchema = z.object({
  codigo_grupo: z.string().min(1).max(5),
  capacidad_maxima: z.number().int().min(1).default(40),
});

export const crearGruposMasivoSchema = z.object({
  cantidad: z.number().int().min(1),
  capacidad_maxima: z.number().int().min(1).optional(),
});