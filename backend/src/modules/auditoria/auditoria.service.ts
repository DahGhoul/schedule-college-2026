import { prisma } from '@/lib/prisma';

export class AuditoriaService {
  static async listar(params: {
    idPeriodo?: number;
    idDocente?: number;
    tipoAccion?: string;
    desde?: string;
    hasta?: string;
    pagina?: number;
    limite?: number;
  }) {
    const where: any = {};

    if (params.tipoAccion) where.tipo_accion = params.tipoAccion;
    if (params.desde || params.hasta) {
      where.fecha = {};
      if (params.desde) where.fecha.gte = new Date(params.desde);
      if (params.hasta) where.fecha.lte = new Date(params.hasta);
    }

    const pagina = params.pagina || 1;
    const limite = params.limite || 50;
    const skip = (pagina - 1) * limite;

    const [registros, total] = await Promise.all([
      prisma.auditoria_horario.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: limite,
      }),
      prisma.auditoria_horario.count({ where }),
    ]);

    return {
      registros,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  static async obtenerPorHorario(idHorario: number) {
    return prisma.auditoria_horario.findMany({
      where: { id_horario: idHorario },
      orderBy: { fecha: 'desc' },
    });
  }
}