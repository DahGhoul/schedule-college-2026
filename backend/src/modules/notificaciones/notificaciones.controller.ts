import { Request, Response } from 'express';
import { NotificacionesService } from './notificaciones.service';
import { GestorNotificaciones } from './gestor-notificaciones.service';
import { actualizarPreferenciasSchema, enviarNotificacionSchema } from './notificaciones.schema';

export class NotificacionesController {
  // GET /api/notificaciones/preferencias/:docenteId
  static async obtenerPreferencias(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.docenteId);
      const prefs = await NotificacionesService.obtenerPreferencias(idDocente);
      res.json(prefs || { correoHabilitado: true, whatsappHabilitado: false, telegramHabilitado: false });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener preferencias' });
    }
  }

  // PUT /api/notificaciones/preferencias/:docenteId
  static async actualizarPreferencias(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.docenteId);
      const datos = actualizarPreferenciasSchema.parse(req.body);
      const prefs = await NotificacionesService.actualizarPreferencias(idDocente, datos);
      res.json(prefs);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(500).json({ error: 'Error al actualizar preferencias' });
      }
    }
  }

  // POST /api/notificaciones/verificar-whatsapp
  static async verificarWhatsApp(req: Request, res: Response) {
    try {
      const { idDocente, codigo } = req.body;
      const verificado = await NotificacionesService.verificarWhatsApp(idDocente, codigo);
      if (verificado) {
        res.json({ mensaje: 'WhatsApp verificado' });
      } else {
        res.status(400).json({ error: 'Código de verificación inválido' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar WhatsApp' });
    }
  }

  // POST /api/notificaciones/vincular-telegram
  static async vincularTelegram(req: Request, res: Response) {
    try {
      const { idDocente, telegramId } = req.body;
      await NotificacionesService.vincularTelegram(idDocente, telegramId);
      res.json({ mensaje: 'Telegram vinculado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al vincular Telegram' });
    }
  }

  // POST /api/notificaciones/enviar
  static async enviar(req: Request, res: Response) {
    try {
      const datos = enviarNotificacionSchema.parse(req.body);
      await NotificacionesService.encolarEnvio(datos);
      res.json({ mensaje: 'Notificación encolada' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(500).json({ error: 'Error al encolar notificación' });
      }
    }
  }

  // GET /api/notificaciones/historial
  static async historial(req: Request, res: Response) {
    try {
      const { idDocente, pagina, limite } = req.query;
      const resultado = await NotificacionesService.obtenerHistorial({
        idDocente: idDocente ? parseInt(idDocente as string) : undefined,
        pagina: pagina ? parseInt(pagina as string) : undefined,
        limite: limite ? parseInt(limite as string) : undefined,
      });
      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  }
}