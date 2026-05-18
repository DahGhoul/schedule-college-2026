import { Request, Response } from 'express';
import { GruposService } from './grupos.service';
import { crearGrupoSchema, actualizarGrupoSchema, crearGrupoPorCursoSchema } from './grupos.schema';

export class GruposController {
  /**
   * GET /api/grupos
   */
  static async listar(req: Request, res: Response) {
    try {
      const { ocupacion } = req.query;
      if (ocupacion === 'true') {
        const idPeriodo = req.query.idPeriodo ? parseInt(req.query.idPeriodo as string) : undefined;
        const grupos = await GruposService.obtenerOcupacion(idPeriodo);
        return res.json(grupos);
      }
      const grupos = await GruposService.listar();
      res.json(grupos);
    } catch (error) {
      console.error('Error al listar grupos:', error);
      res.status(500).json({ error: 'Error al obtener los grupos' });
    }
  }

  /**
   * GET /api/grupos/:id
   */
  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const grupo = await GruposService.obtenerPorId(id);
      if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });
      res.json(grupo);
    } catch (error) {
      console.error('Error al obtener grupo:', error);
      res.status(500).json({ error: 'Error al obtener el grupo' });
    }
  }

  /**
   * POST /api/grupos
   */
  static async crear(req: Request, res: Response) {
    try {
      const datos = crearGrupoSchema.parse(req.body) as {
        id_curso: number;
        codigo_grupo: string;
        capacidad_maxima: number;
      };
      const grupo = await GruposService.crear(datos);
      res.status(201).json(grupo);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.message === 'Curso no encontrado') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Ya existe un grupo con ese código en este curso') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error al crear grupo:', error);
      res.status(500).json({ error: 'Error al crear el grupo' });
    }
  }

  /**
   * PUT /api/grupos/:id
   */
  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarGrupoSchema.parse(req.body);
      const grupo = await GruposService.actualizar(id, datos);
      res.json(grupo);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.message === 'Ya existe otro grupo con ese código en este curso') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error al actualizar grupo:', error);
      res.status(500).json({ error: 'Error al actualizar el grupo' });
    }
  }

  /**
   * DELETE /api/grupos/:id
   */
  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await GruposService.eliminar(id);
      res.json({ mensaje: 'Grupo desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar grupo:', error);
      res.status(500).json({ error: 'Error al eliminar el grupo' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const grupo = await GruposService.reactivar(id);
      res.json(grupo);
    } catch (error) {
      console.error('Error al reactivar grupo:', error);
      res.status(500).json({ error: 'Error al reactivar el grupo' });
    }
  }

  /**
   * GET /api/grupos/por-curso/:cursoId
   */
  static async listarPorCurso(req: Request, res: Response) {
    try {
      const idCurso = parseInt(req.params.cursoId);
      if (isNaN(idCurso)) return res.status(400).json({ error: 'ID de curso inválido' });

      const grupos = await GruposService.listarPorCurso(idCurso);
      res.json(grupos);
    } catch (error) {
      console.error('Error al listar grupos por curso:', error);
      res.status(500).json({ error: 'Error al obtener los grupos del curso' });
    }
  }
}