import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import { GestorNotificaciones } from '@/modules/notificaciones/gestor-notificaciones.service';

const worker = new Worker(
  'notificaciones',
  async (job) => {
    const { idDocente, canal, tipoMensaje, contenido } = job.data;
    console.log(`Enviando notificación a docente ${idDocente} por ${canal}`);
    const exito = await GestorNotificaciones.enviar({
      idDocente,
      canal,
      tipoMensaje,
      contenido,
    });
    if (!exito) throw new Error(`Fallo el envío por ${canal}`);
    return { exito };
  },
  { connection: redis }
);

export default worker;