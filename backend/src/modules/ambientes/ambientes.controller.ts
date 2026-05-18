import { Request, Response } from 'express';
import { AmbientesService } from './ambientes.service';
import { crearAmbienteSchema, actualizarAmbienteSchema, registroMantenimientoSchema } from './ambientes.schema';

export class AmbientesController {
  /**
   * GET /api/ambientes
   */
  static async listar(req: Request, res: Response) {
    try {
      const { tipo } = req.query;
      const ambientes = await AmbientesService.listar(tipo as string);
      res.json(ambientes);
    } catch (error) {
      console.error('Error al listar ambientes:', error);
      res.status(500).json({ error: 'Error al obtener los ambientes' });
    }
  }

  /**
   * GET /api/ambientes/:id
   */
  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const ambiente = await AmbientesService.obtenerPorId(id);
      if (!ambiente) return res.status(404).json({ error: 'Ambiente no encontrado' });
      res.json(ambiente);
    } catch (error) {
      console.error('Error al obtener ambiente:', error);
      res.status(500).json({ error: 'Error al obtener el ambiente' });
    }
  }

  /**
   * POST /api/ambientes
   */
  static async crear(req: Request, res: Response) {
    try {
      const datos = crearAmbienteSchema.parse(req.body) as {
        codigo: string;
        tipo: string;
        capacidad: number;
        piso?: number;
        equipamiento?: string;
      };
      const ambiente = await AmbientesService.crear(datos);
      res.status(201).json(ambiente);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un ambiente con ese código' });
      }
      console.error('Error al crear ambiente:', error);
      res.status(500).json({ error: 'Error al crear el ambiente' });
    }
  }

  /**
   * PUT /api/ambientes/:id
   */
  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarAmbienteSchema.parse(req.body);
      const ambiente = await AmbientesService.actualizar(id, datos);
      res.json(ambiente);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      console.error('Error al actualizar ambiente:', error);
      res.status(500).json({ error: 'Error al actualizar el ambiente' });
    }
  }

  /**
   * DELETE /api/ambientes/:id
   */
  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await AmbientesService.eliminar(id);
      res.json({ mensaje: 'Ambiente desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar ambiente:', error);
      res.status(500).json({ error: 'Error al desactivar el ambiente' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const ambiente = await AmbientesService.reactivar(id);
      res.json(ambiente);
    } catch (error) {
      console.error('Error al reactivar ambiente:', error);
      res.status(500).json({ error: 'Error al reactivar el ambiente' });
    }
  }

  /**
   * GET /api/ambientes/por-tipo/:tipo
   */
  static async listarPorTipo(req: Request, res: Response) {
    try {
      const { tipo } = req.params;
      const ambientes = await AmbientesService.listarPorTipo(tipo);
      res.json(ambientes);
    } catch (error) {
      console.error('Error al listar por tipo:', error);
      res.status(500).json({ error: 'Error al obtener ambientes por tipo' });
    }
  }

  /**
   * GET /api/ambientes/:id/disponibilidad
   */
  static async obtenerDisponibilidad(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { fecha } = req.query;

      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const fechaConsulta = fecha ? new Date(fecha as string) : new Date();
      const disponibilidad = await AmbientesService.obtenerDisponibilidad(id, fechaConsulta);
      res.json(disponibilidad);
    } catch (error: any) {
      if (error.message === 'Ambiente no encontrado') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error al obtener disponibilidad:', error);
      res.status(500).json({ error: 'Error al obtener disponibilidad' });
    }
  }

  /**
   * GET /api/ambientes/disponibilidad-general
   */
  static async disponibilidadGeneral(req: Request, res: Response) {
    try {
      const { idPeriodo } = req.query;
      if (!idPeriodo) return res.status(400).json({ error: 'ID de período requerido' });

      const disponibilidad = await AmbientesService.obtenerDisponibilidadGeneral(
        parseInt(idPeriodo as string)
      );
      res.json(disponibilidad);
    } catch (error) {
      console.error('Error al obtener disponibilidad general:', error);
      res.status(500).json({ error: 'Error al obtener disponibilidad general' });
    }
  }

  /**
   * POST /api/ambientes/:id/mantenimiento
   */
  static async registrarMantenimiento(req: Request, res: Response) {
    try {
      const idAmbiente = parseInt(req.params.id);
      if (isNaN(idAmbiente)) return res.status(400).json({ error: 'ID de ambiente inválido' });

      const datos = registroMantenimientoSchema.parse(req.body) as {
        fecha_inicio: string;
        fecha_fin: string;
        descripcion?: string;
      };
      const mantenimiento = await AmbientesService.registrarMantenimiento(idAmbiente, datos);
      res.status(201).json(mantenimiento);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      console.error('Error al registrar mantenimiento:', error);
      res.status(500).json({ error: 'Error al registrar mantenimiento' });
    }
  }
}