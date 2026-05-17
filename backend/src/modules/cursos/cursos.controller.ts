import { Request, Response } from 'express';
import { CursosService } from './cursos.service';
import { crearCursoSchema, actualizarCursoSchema, asignarAmbienteSchema } from './cursos.schema';

export class CursosController {
  /**
   * GET /api/cursos
   */
  static async listar(req: Request, res: Response) {
    try {
      const { buscar } = req.query;
      const cursos = await CursosService.listar(buscar as string);
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
      const datos = crearCursoSchema.parse(req.body);
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
      res.json({ mensaje: 'Curso eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar curso:', error);
      res.status(500).json({ error: 'Error al eliminar el curso' });
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
   * POST /api/cursos/:id/ambientes
   */
  static async agregarAmbiente(req: Request, res: Response) {
    try {
      const idCurso = parseInt(req.params.id);
      if (isNaN(idCurso)) return res.status(400).json({ error: 'ID de curso inválido' });

      const datos = asignarAmbienteSchema.parse(req.body);
      const asignacion = await CursosService.agregarAmbiente(
        idCurso,
        datos.id_ambiente,
        datos.tipo_clase
      );
      res.status(201).json(asignacion);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.message === 'El ambiente ya está asignado a este curso para ese tipo de clase') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error al agregar ambiente:', error);
      res.status(500).json({ error: 'Error al agregar ambiente al curso' });
    }
  }

  /**
   * DELETE /api/cursos/:id/ambientes/:ambienteId/:tipoClase
   */
  static async quitarAmbiente(req: Request, res: Response) {
    try {
      const idCurso = parseInt(req.params.id);
      const idAmbiente = parseInt(req.params.ambienteId);
      const { tipoClase } = req.params;

      if (isNaN(idCurso) || isNaN(idAmbiente)) {
        return res.status(400).json({ error: 'IDs inválidos' });
      }

      await CursosService.quitarAmbiente(idCurso, idAmbiente, tipoClase);
      res.json({ mensaje: 'Ambiente removido del curso' });
    } catch (error) {
      console.error('Error al quitar ambiente:', error);
      res.status(500).json({ error: 'Error al quitar ambiente del curso' });
    }
  }

  /**
   * GET /api/cursos/:id/ambientes
   */
  static async listarAmbientes(req: Request, res: Response) {
    try {
      const idCurso = parseInt(req.params.id);
      if (isNaN(idCurso)) return res.status(400).json({ error: 'ID de curso inválido' });

      const ambientes = await CursosService.listarAmbientes(idCurso);
      res.json(ambientes);
    } catch (error) {
      console.error('Error al listar ambientes del curso:', error);
      res.status(500).json({ error: 'Error al obtener ambientes del curso' });
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