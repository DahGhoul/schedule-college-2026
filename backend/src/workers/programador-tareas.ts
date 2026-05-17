import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { NotificacionesService } from '@/modules/notificaciones/notificaciones.service';

export function iniciarProgramadorTareas() {
  // Cada minuto (ajustar en producción)
  cron.schedule('* * * * *', async () => {
    console.log('Verificando recordatorios...');
    await verificarRecordatorios();
  });
}

async function verificarRecordatorios() {
  try {
    const ahora = new Date();

    // Buscar ventanas de atención próximas (24h)
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);

    const ventanasProximas = await prisma.ventana_atencion.findMany({
      where: {
        fecha: {
          gte: manana,
          lt: new Date(manana.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        atenciones: {
          include: { docente: true },
        },
      },
    });

    for (const ventana of ventanasProximas) {
      for (const atencion of ventana.atenciones) {
        if (atencion.estado === 'PENDIENTE') {
          const contenido = `
            <h2>Recordatorio de Ventana de Atención</h2>
            <p>Estimado(a) ${atencion.docente.nombres},</p>
            <p>Le recordamos que tiene una ventana de atención programada para mañana:</p>
            <p><strong>Fecha:</strong> ${ventana.fecha.toISOString().split('T')[0]}</p>
            <p><strong>Horario:</strong> ${ventana.hora_inicio} - ${ventana.hora_fin}</p>
            <p>Por favor, asista puntualmente.</p>
          `;
          await NotificacionesService.encolarRecordatorio(
            atencion.id_docente,
            'RECORDATORIO_24H',
            contenido
          );
        }
      }
    }
  } catch (error) {
    console.error('Error en programador de tareas:', error);
  }
}