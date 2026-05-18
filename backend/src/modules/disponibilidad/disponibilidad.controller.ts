import { Request, Response } from 'express';
import { DisponibilidadService } from './disponibilidad.service';

export class DisponibilidadController {
  static async obtenerPorDocente(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.idDocente);
      if (isNaN(idDocente)) return res.status(400).json({ error: 'ID de docente inválido' });

      const disponibilidad = await DisponibilidadService.obtenerPorDocente(idDocente);
      res.json(disponibilidad);
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      res.status(500).json({ error: 'Error al obtener disponibilidad' });
    }
  }

  static async actualizarBatch(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.idDocente);
      if (isNaN(idDocente)) return res.status(400).json({ error: 'ID de docente inválido' });

      const { disponibilidades } = req.body;
      if (!Array.isArray(disponibilidades)) {
        return res.status(400).json({ error: 'Se requiere un array de disponibilidades' });
      }

      const resultados = await DisponibilidadService.actualizarBatch(idDocente, disponibilidades);
      res.json(resultados);
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
      res.status(500).json({ error: 'Error al actualizar disponibilidad' });
    }
  }
}
