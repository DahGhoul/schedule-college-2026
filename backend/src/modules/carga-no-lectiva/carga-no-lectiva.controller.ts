import { Request, Response } from 'express';
import { CargaNoLectivaService } from './carga-no-lectiva.service';

export class CargaNoLectivaController {
  static async obtenerMiDeclaracion(req: Request, res: Response) {
    const usuario = (req as any).usuario;
    const idDocente = usuario?.id_docente;
    const idPeriodo = Number(req.params.id_periodo);

    if (!idDocente) {
      return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
    }

    const datos = await CargaNoLectivaService.obtenerMiDeclaracion(Number(idDocente), idPeriodo);
    res.json(datos);
  }

  static async guardarMiDeclaracion(req: Request, res: Response) {
    const usuario = (req as any).usuario;
    const idDocente = usuario?.id_docente;
    const idPeriodo = Number(req.params.id_periodo);

    if (!idDocente) {
      return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
    }

    const datos = await CargaNoLectivaService.guardarMiDeclaracion(Number(idDocente), idPeriodo, req.body);
    res.json(datos);
  }

  static async eliminarMiDeclaracion(req: Request, res: Response) {
    const usuario = (req as any).usuario;
    const idDocente = usuario?.id_docente;
    const idPeriodo = Number(req.params.id_periodo);

    if (!idDocente) {
      return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
    }

    const resultado = await CargaNoLectivaService.eliminarMiDeclaracion(Number(idDocente), idPeriodo);
    res.json(resultado);
  }
}