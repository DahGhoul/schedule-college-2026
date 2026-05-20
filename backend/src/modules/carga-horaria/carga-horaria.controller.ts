import { Request, Response } from 'express';
import { CargaHorariaService } from './carga-horaria.service';
import { z } from 'zod';

const asignarCargaSchema = z.object({
  id_componente: z.number().int().positive(),
  id_docente: z.number().int().positive(),
  horas_asignadas: z.number().int().positive(),
});

const configurarOfertaSchema = z.object({
  id_periodo: z.number().int().positive(),
  id_curso: z.number().int().positive(),
  id_ciclo: z.number().int().positive(),
  tipo_curso: z.enum(['REGULAR', 'ELECTIVO']),
  componentes: z.array(z.object({
    tipo: z.enum(['TEORIA', 'PRACTICA', 'LABORATORIO']),
    horas_requeridas: z.number().int().positive(),
    n_grupos: z.number().int().min(1),
  })),
});

export class CargaHorariaController {
  static async asignarCarga(req: Request, res: Response) {
    try {
      const datos = asignarCargaSchema.parse(req.body) as {
        id_componente: number;
        id_docente: number;
        horas_asignadas: number;
      };
      const resultado = await CargaHorariaService.asignarCarga(datos);
      res.json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async obtenerResumenCarga(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      
      const resumen = await CargaHorariaService.obtenerResumenCarga(id_periodo);
      res.json(resumen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async configurarOferta(req: Request, res: Response) {
    try {
      const datos = configurarOfertaSchema.parse(req.body);
      const resultado = await CargaHorariaService.configurarOferta(datos as any);
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async eliminarAsignacion(req: Request, res: Response) {
    try {
      const id_asignacion = parseInt(req.params.id_asignacion);
      if (isNaN(id_asignacion)) return res.status(400).json({ error: 'ID de asignación inválido' });
      
      const resultado = await CargaHorariaService.eliminarAsignacion(id_asignacion);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerCiclosPorPeriodo(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      
      const ciclos = await CargaHorariaService.obtenerCiclosPorPeriodo(id_periodo);
      res.json(ciclos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerCursosPorCiclo(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      const id_ciclo = req.query.id_ciclo ? parseInt(req.query.id_ciclo as string) : undefined;
      
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      
      const cursos = await CargaHorariaService.obtenerCursosPorCiclo(id_periodo, id_ciclo);
      res.json(cursos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
