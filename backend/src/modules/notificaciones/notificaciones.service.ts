import { prisma } from '@/lib/prisma';
import { colaNotificaciones } from '@/cola/cola-notificaciones';

export class NotificacionesService {
  // ─── Preferencias ───
  static async obtenerPreferencias(idDocente: number) {
    return prisma.preferencia_notificacion.findUnique({
      where: { id_docente: idDocente },
    });
  }

  static async actualizarPreferencias(idDocente: number, datos: any) {
    return prisma.preferencia_notificacion.upsert({
      where: { id_docente: idDocente },
      update: datos,
      create: { id_docente: idDocente, ...datos },
    });
  }

  // ─── Verificación de canales ───
  static async verificarWhatsApp(idDocente: number, codigo: string) {
    // Simulación de verificación (en producción usaríamos la API de WhatsApp)
    if (codigo === '123456') {
      await prisma.preferencia_notificacion.update({
        where: { id_docente: idDocente },
        data: { whatsapp_verificado: true },
      });
      return true;
    }
    return false;
  }

  static async vincularTelegram(idDocente: number, telegramId: string) {
    return prisma.preferencia_notificacion.upsert({
      where: { id_docente: idDocente },
      update: { telegram_id: telegramId, telegram_habilitado: true },
      create: { id_docente: idDocente, telegram_id: telegramId, telegram_habilitado: true },
    });
  }

  // ─── Envío (encolado) ───
  static async encolarEnvio(notificacion: {
    idDocente: number;
    canal: string;
    tipoMensaje: string;
    contenido: string;
  }) {
    await colaNotificaciones.add('enviar-notificacion', notificacion, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  static async encolarRecordatorio(idDocente: number, tipo: string, contenido: string) {
    const prefs = await prisma.preferencia_notificacion.findUnique({
      where: { id_docente: idDocente },
    });
    if (!prefs) return;

    if (prefs.correo_habilitado) {
      await this.encolarEnvio({
        idDocente,
        canal: 'CORREO',
        tipoMensaje: tipo,
        contenido,
      });
    }
    if (prefs.whatsapp_habilitado && prefs.whatsapp_verificado) {
      await this.encolarEnvio({
        idDocente,
        canal: 'WHATSAPP',
        tipoMensaje: tipo,
        contenido,
      });
    }
    if (prefs.telegram_habilitado && prefs.telegram_id) {
      await this.encolarEnvio({
        idDocente,
        canal: 'TELEGRAM',
        tipoMensaje: tipo,
        contenido,
      });
    }
  }

  // ─── Historial ───
  static async obtenerHistorial(params: {
    idDocente?: number;
    pagina?: number;
    limite?: number;
  }) {
    const where: any = {};
    if (params.idDocente) where.id_docente = params.idDocente;

    const pagina = params.pagina || 1;
    const limite = params.limite || 20;
    const skip = (pagina - 1) * limite;

    const [registros, total] = await Promise.all([
      prisma.historial_notificacion.findMany({
        where,
        orderBy: { fecha_envio: 'desc' },
        skip,
        take: limite,
      }),
      prisma.historial_notificacion.count({ where }),
    ]);

    return { registros, total, pagina, totalPaginas: Math.ceil(total / limite) };
  }
}