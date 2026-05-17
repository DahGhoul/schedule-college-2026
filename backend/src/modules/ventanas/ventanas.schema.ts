import { z } from 'zod';

const categoriaSlotSchema = z.object({
  categoria: z.enum(['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA']),
  modalidad: z.enum(['NOMBRADO', 'CONTRATADO']),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  orden: z.number().int().min(1),
});

const diaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categorias: z.array(categoriaSlotSchema).min(1),
});

export const configurarVentanasSchema = z.object({
  idPeriodo: z.number().int().positive(),
  dias: z.array(diaSchema).min(1),
});