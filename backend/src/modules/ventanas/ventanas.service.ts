import { prisma } from '@/lib/prisma';

export class VentanasService {
  // Configurar ventanas para un período (sobrescribe existentes)
  static async configurar(
    idPeriodo: number,
    dias: Array<{
      fecha: string;
      categorias: Array<{
        categoria: string;
        modalidad: string;
        hora_inicio: string;
        hora_fin: string;
        orden: number;
      }>;
    }>
  ) {
    // Eliminar ventanas anteriores del período
    const existentes = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    const ids = existentes.map((v) => v.id);
    if (ids.length) {
      await prisma.atencion_docente.deleteMany({ where: { id_ventana: { in: ids } } });
      await prisma.ventana_atencion.deleteMany({ where: { id_periodo: idPeriodo } });
    }

    const creadas = [];
    for (const dia of dias) {
      for (const slot of dia.categorias) {
        const ventana = await prisma.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: new Date(dia.fecha),
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            categoria: slot.categoria,
            modalidad: slot.modalidad,
            orden: slot.orden,
            estado: 'PENDIENTE',
          },
        });
        creadas.push(ventana);
      }
    }
    return creadas;
  }

  static async listar(idPeriodo?: number) {
    return prisma.ventana_atencion.findMany({
      where: idPeriodo ? { id_periodo: idPeriodo } : {},
      include: { atenciones: { include: { docente: true } } },
      orderBy: [{ fecha: 'asc' }, { orden: 'asc' }],
    });
  }

  static async obtenerActiva(idPeriodo?: number) {
    return prisma.ventana_atencion.findFirst({
      where: { ...(idPeriodo && { id_periodo: idPeriodo }), estado: { not: 'COMPLETADO' } },
      orderBy: [{ fecha: 'asc' }, { orden: 'asc' }],
      include: { atenciones: { include: { docente: true } } },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.ventana_atencion.findUnique({
      where: { id },
      include: { atenciones: { include: { docente: true }, orderBy: { orden_espera: 'asc' } } },
    });
  }

  static async iniciarVentana(id: number) {
    const ventana = await prisma.ventana_atencion.findUnique({ where: { id } });
    if (!ventana) throw new Error('Ventana no encontrada');
    if (ventana.estado !== 'PENDIENTE') throw new Error('La ventana ya fue iniciada o completada');

    const docentes = await prisma.docente.findMany({
      where: { modalidad: ventana.modalidad, categoria: ventana.categoria, activo: true },
      orderBy: { antiguedad: 'desc' },
    });

    const atenciones = await Promise.all(
      docentes.map((docente, index) =>
        prisma.atencion_docente.create({
          data: {
            id_ventana: id,
            id_docente: docente.id,
            orden_espera: index + 1,
            estado: 'PENDIENTE',
          },
        })
      )
    );

    await prisma.ventana_atencion.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
    return { ventana: { ...ventana, estado: 'EN_PROCESO' }, atenciones };
  }

  static async obtenerCola(idVentana: number) {
    return prisma.atencion_docente.findMany({
      where: { id_ventana: idVentana },
      orderBy: { orden_espera: 'asc' },
      include: { docente: true },
    });
  }

  static async siguienteDocente(idVentana: number) {
    const actual = await prisma.atencion_docente.findFirst({
      where: { id_ventana: idVentana, estado: 'EN_PROCESO' },
      orderBy: { orden_espera: 'asc' },
    });
    if (actual) {
      await prisma.atencion_docente.update({ where: { id: actual.id }, data: { estado: 'COMPLETADO' } });
    }
    const siguiente = await prisma.atencion_docente.findFirst({
      where: { id_ventana: idVentana, estado: 'PENDIENTE' },
      orderBy: { orden_espera: 'asc' },
      include: { docente: true },
    });
    if (siguiente) {
      await prisma.atencion_docente.update({ where: { id: siguiente.id }, data: { estado: 'EN_PROCESO' } });
    } else {
      await prisma.ventana_atencion.update({ where: { id: idVentana }, data: { estado: 'COMPLETADO' } });
    }
    return siguiente;
  }

  static async marcarAtendido(idVentana: number, idDocente: number) {
    const atencion = await prisma.atencion_docente.findFirst({
      where: { id_ventana: idVentana, id_docente: idDocente },
    });
    if (!atencion || atencion.estado !== 'EN_PROCESO') throw new Error('El docente no está en atención');
    await prisma.atencion_docente.update({ where: { id: atencion.id }, data: { estado: 'COMPLETADO' } });
    const pendientes = await prisma.atencion_docente.count({
      where: { id_ventana: idVentana, estado: { in: ['PENDIENTE', 'EN_PROCESO'] } },
    });
    if (pendientes === 0) {
      await prisma.ventana_atencion.update({ where: { id: idVentana }, data: { estado: 'COMPLETADO' } });
    }
  }
}