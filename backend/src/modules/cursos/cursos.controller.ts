import { Request, Response } from 'express';
import { CursosService } from './cursos.service';
import { crearCursoSchema, actualizarCursoSchema } from './cursos.schema';

export class CursosController {
  /**
   * GET /api/cursos
   */
  static async listar(req: Request, res: Response) {
    try {
      const { buscar, id_curricula } = req.query;
      const idCurricula = id_curricula ? parseInt(id_curricula as string) : undefined;
      const cursos = await CursosService.listar(buscar as string, idCurricula);
      res.json(cursos);
    } catch (error) {
      console.error('Error al listar cursos:', error);
      res.status(500).json({ error: 'Error al obtener los cursos' });
    }
  }

  /**
   * GET /api/cursos/:id
   */
  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const curso = await CursosService.obtenerPorId(id);
      if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
      res.json(curso);
    } catch (error) {
      console.error('Error al obtener curso:', error);
      res.status(500).json({ error: 'Error al obtener el curso' });
    }
  }

  /**
   * POST /api/cursos
   */
  static async crear(req: Request, res: Response) {
    try {
      const datos = crearCursoSchema.parse(req.body) as {
        nombre: string;
        codigo: string;
        creditos: number;
      };
      const curso = await CursosService.crear(datos);
      res.status(201).json(curso);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un curso con ese código' });
      }
      console.error('Error al crear curso:', error);
      res.status(500).json({ error: 'Error al crear el curso' });
    }
  }

  /**
   * PUT /api/cursos/:id
   */
  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarCursoSchema.parse(req.body);
      const curso = await CursosService.actualizar(id, datos);
      res.json(curso);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un curso con ese código' });
      }
      console.error('Error al actualizar curso:', error);
      res.status(500).json({ error: 'Error al actualizar el curso' });
    }
  }

  /**
   * DELETE /api/cursos/:id
   */
  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await CursosService.eliminar(id);
      res.json({ mensaje: 'Curso desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar curso:', error);
      res.status(500).json({ error: 'Error al eliminar el curso' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const curso = await CursosService.reactivar(id);
      res.json(curso);
    } catch (error) {
      console.error('Error al reactivar curso:', error);
      res.status(500).json({ error: 'Error al reactivar el curso' });
    }
  }

  /**
   * GET /api/cursos/buscar?q=texto
   */
  static async buscar(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });

      const cursos = await CursosService.buscar(q as string);
      res.json(cursos);
    } catch (error) {
      console.error('Error al buscar cursos:', error);
      res.status(500).json({ error: 'Error al buscar cursos' });
    }
  }

  /**
   * POST /api/cursos/importar
   */
  static async importar(req: Request, res: Response) {
    try {
      const { cursos } = req.body;
      if (!Array.isArray(cursos) || cursos.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de cursos' });
      }

      const resultados = await CursosService.importar(cursos);
      res.status(201).json(resultados);
    } catch (error) {
      console.error('Error al importar cursos:', error);
      res.status(500).json({ error: 'Error al importar cursos' });
    }
  }
}
