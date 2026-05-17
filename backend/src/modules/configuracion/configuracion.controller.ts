import { Request, Response } from 'express';
import { ConfiguracionService } from './configuracion.service';
import { restriccionesSchema, diaNoLaborableSchema, actualizarDiaNoLaborableSchema } from './configuracion.schema';

export class ConfiguracionController {
  // ─── Restricciones ───

  static async obtenerRestricciones(req: Request, res: Response) {
    try {
      const restricciones = await ConfiguracionService.obtenerRestricciones();
      res.json(restricciones);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async actualizarRestricciones(req: Request, res: Response) {
    try {
      const datos = restriccionesSchema.parse(req.body);
      await ConfiguracionService.actualizarRestricciones(datos as any);
      res.json({ mensaje: 'Restricciones actualizadas' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  // ─── Días no laborables ───

  static async listarDiasNoLaborables(req: Request, res: Response) {
    const anio = req.query.anio ? parseInt(req.query.anio as string) : undefined;
    const dias = await ConfiguracionService.listarDiasNoLaborables(anio);
    res.json(dias);
  }

  static async crearDiaNoLaborable(req: Request, res: Response) {
    const datos = diaNoLaborableSchema.parse(req.body);
    const dia = await ConfiguracionService.crearDiaNoLaborable(datos);
    res.status(201).json(dia);
  }

  static async actualizarDiaNoLaborable(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const datos = actualizarDiaNoLaborableSchema.parse(req.body);
    const dia = await ConfiguracionService.actualizarDiaNoLaborable(id, datos);
    res.json(dia);
  }

  static async eliminarDiaNoLaborable(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    await ConfiguracionService.eliminarDiaNoLaborable(id);
    res.json({ mensaje: 'Día no laborable eliminado' });
  }
}