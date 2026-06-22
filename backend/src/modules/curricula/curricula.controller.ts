import { Request, Response } from 'express';
import { CurriculaService } from './curricula.service';
import { crearCurriculaSchema, actualizarCurriculaSchema } from './curricula.schema';

export class CurriculaController {
  static async listar(req: Request, res: Response) {
    try {
      const curricula = await CurriculaService.listar();
      res.json(curricula);
    } catch (error) {
      console.error('Error al listar currículas:', error);
      res.status(500).json({ error: 'Error al obtener las currículas' });
    }
  }

  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const curricula = await CurriculaService.obtenerPorId(id);
      if (!curricula) return res.status(404).json({ error: 'Currícula no encontrada' });
      res.json(curricula);
    } catch (error) {
      console.error('Error al obtener currícula:', error);
      res.status(500).json({ error: 'Error al obtener la currícula' });
    }
  }

  static async obtenerVigente(req: Request, res: Response) {
    try {
      const curricula = await CurriculaService.obtenerVigente();
      if (!curricula) return res.status(404).json({ error: 'No hay una currícula vigente' });
      res.json(curricula);
    } catch (error) {
      console.error('Error al obtener currícula vigente:', error);
      res.status(500).json({ error: 'Error al obtener la currícula vigente' });
    }
  }

  static async crear(req: Request, res: Response) {
    try {
      const datos = crearCurriculaSchema.parse(req.body) as {
        codigo: string;
        nombre: string;
        vigente?: boolean;
      };
      const curricula = await CurriculaService.crear(datos);
      res.status(201).json(curricula);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe una currícula con ese código' });
      }
      console.error('Error al crear currícula:', error);
      res.status(500).json({ error: 'Error al crear la currícula' });
    }
  }

  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarCurriculaSchema.parse(req.body);
      const curricula = await CurriculaService.actualizar(id, datos);
      res.json(curricula);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      console.error('Error al actualizar currícula:', error);
      res.status(500).json({ error: 'Error al actualizar la currícula' });
    }
  }

  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await CurriculaService.eliminar(id);
      res.json({ mensaje: 'Currícula desactivada correctamente' });
    } catch (error) {
      console.error('Error al eliminar currícula:', error);
      res.status(500).json({ error: 'Error al desactivar la currícula' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const curricula = await CurriculaService.reactivar(id);
      res.json(curricula);
    } catch (error) {
      console.error('Error al reactivar currícula:', error);
      res.status(500).json({ error: 'Error al reactivar la currícula' });
    }
  }
}
