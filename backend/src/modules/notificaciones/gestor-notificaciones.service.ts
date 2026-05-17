import { prisma } from '@/lib/prisma';
import { ServicioCorreo } from './servicio-correo';
import { ServicioWhatsApp } from './servicio-whatsapp';
import { ServicioTelegram } from './servicio-telegram';
import { NotificacionEnvio } from './notificaciones.types';

export class GestorNotificaciones {
  static async enviar(notificacion: NotificacionEnvio): Promise<boolean> {
    const docente = await prisma.docente.findUnique({
      where: { id: notificacion.idDocente },
      include: { preferencias: true },
    });
    if (!docente) return false;

    const prefs = docente.preferencias;
    let exito = false;

    switch (notificacion.canal) {
      case 'CORREO':
        if (prefs?.correo_habilitado) {
          exito = await ServicioCorreo.enviar(
            docente.email,
            `Horarios UNT - ${notificacion.tipoMensaje}`,
            notificacion.contenido
          );
        }
        break;
      case 'WHATSAPP':
        if (prefs?.whatsapp_habilitado && prefs.whatsapp_verificado && docente.telefono) {
          exito = await ServicioWhatsApp.enviar(docente.telefono, notificacion.contenido);
        }
        break;
      case 'TELEGRAM':
        if (prefs?.telegram_habilitado && prefs.telegram_id) {
          exito = await ServicioTelegram.enviar(prefs.telegram_id, notificacion.contenido);
        }
        break;
    }

    // Registrar en historial
    await prisma.historial_notificacion.create({
      data: {
        id_docente: notificacion.idDocente,
        canal: notificacion.canal,
        tipo_mensaje: notificacion.tipoMensaje,
        estado_envio: exito ? 'ENVIADO' : 'FALLIDO',
        contenido: notificacion.contenido,
      },
    });

    return exito;
  }

  static async enviarMultiCanal(
    idDocente: number,
    tipoMensaje: string,
    contenido: string
  ): Promise<void> {
    const canales: Array<'CORREO' | 'WHATSAPP' | 'TELEGRAM'> = ['CORREO', 'WHATSAPP', 'TELEGRAM'];
    for (const canal of canales) {
      await this.enviar({ idDocente, canal, tipoMensaje: tipoMensaje as any, contenido });
    }
  }
}