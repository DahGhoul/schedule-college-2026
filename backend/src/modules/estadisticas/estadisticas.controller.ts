import { Request, Response } from 'express';
import { EstadisticasService } from './estadisticas.service';

export class EstadisticasController {
  static async resumen(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string) || 0;
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
      const data = await EstadisticasService.obtenerResumen(idPeriodo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener resumen' });
    }
  }

  static async avanceCategoria(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string) || 0;
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
      const data = await EstadisticasService.obtenerAvancePorCategoria(idPeriodo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener avance por categoría' });
    }
  }

  static async ocupacionAmbientes(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string) || 0;
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
      const data = await EstadisticasService.obtenerOcupacionAmbientes(idPeriodo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener ocupación de ambientes' });
    }
  }

  static async mapaCalor(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string) || 0;
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
      const data = await EstadisticasService.obtenerMapaCalor(idPeriodo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener mapa de calor' });
    }
  }

  static async cargaDocente(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string) || 0;
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
      const data = await EstadisticasService.obtenerCargaDocente(idPeriodo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener carga docente' });
    }
  }
}