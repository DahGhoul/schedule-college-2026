import { Request, Response } from 'express';
import { AuditoriaService } from './auditoria.service';

export class AuditoriaController {
  static async listar(req: Request, res: Response) {
    try {
      const { periodo, docente, accion, desde, hasta, pagina, limite } = req.query;
      const resultado = await AuditoriaService.listar({
        idPeriodo: periodo ? parseInt(periodo as string) : undefined,
        idDocente: docente ? parseInt(docente as string) : undefined,
        tipoAccion: accion as string,
        desde: desde as string,
        hasta: hasta as string,
        pagina: pagina ? parseInt(pagina as string) : undefined,
        limite: limite ? parseInt(limite as string) : undefined,
      });
      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener auditoría' });
    }
  }

  static async obtenerPorHorario(req: Request, res: Response) {
    try {
      const idHorario = parseInt(req.params.idHorario);
      const registros = await AuditoriaService.obtenerPorHorario(idHorario);
      res.json(registros);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener auditoría del horario' });
    }
  }
}