import { Request, Response } from 'express';
import { CargaNoLectivaService } from './carga-no-lectiva.service';

export class CargaNoLectivaController {
  static async obtenerMiDeclaracion(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente ?? usuario?.id_docente;
      const idPeriodo = Number(req.params.id_periodo);

      if (!idDocente) {
        return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
      }

      if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) {
        return res.status(400).json({ error: 'Periodo inválido' });
      }

      const datos = await CargaNoLectivaService.obtenerMiDeclaracion(Number(idDocente), idPeriodo);
      res.json(datos);
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? 'No se pudo obtener la declaración' });
    }
  }

  static async guardarMiDeclaracion(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente ?? usuario?.id_docente;
      const idPeriodo = Number(req.params.id_periodo);

      if (!idDocente) {
        return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
      }

      if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) {
        return res.status(400).json({ error: 'Periodo inválido' });
      }

      const datos = await CargaNoLectivaService.guardarMiDeclaracion(Number(idDocente), idPeriodo, req.body);
      res.json(datos);
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? 'No se pudo guardar la declaración' });
    }
  }

  static async eliminarMiDeclaracion(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente ?? usuario?.id_docente;
      const idPeriodo = Number(req.params.id_periodo);

      if (!idDocente) {
        return res.status(400).json({ error: 'El usuario autenticado no tiene docente asociado' });
      }

      if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) {
        return res.status(400).json({ error: 'Periodo inválido' });
      }

      const resultado = await CargaNoLectivaService.eliminarMiDeclaracion(Number(idDocente), idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? 'No se pudo eliminar la declaración' });
    }
  }

  static async obtenerMiHorarioNoLectivo(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente ?? usuario?.id_docente;
      const idPeriodo = Number(req.params.id_periodo);
      if (!idDocente) return res.status(400).json({ error: 'Usuario no asociado' });
      if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) return res.status(400).json({ error: 'Periodo inválido' });
      
      const datos = await CargaNoLectivaService.obtenerMiHorarioNoLectivo(Number(idDocente), idPeriodo);
      res.json(datos);
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? 'Error al obtener horario no lectivo' });
    }
  }

  static async guardarMiHorarioNoLectivo(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente ?? usuario?.id_docente;
      const idPeriodo = Number(req.params.id_periodo);
      if (!idDocente) return res.status(400).json({ error: 'Usuario no asociado' });
      if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) return res.status(400).json({ error: 'Periodo inválido' });
      
      const datos = await CargaNoLectivaService.guardarMiHorarioNoLectivo(Number(idDocente), idPeriodo, req.body.bloques);
      res.json(datos);
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? 'Error al guardar horario no lectivo' });
    }
  }
}