import { prisma } from '@/lib/prisma';

export class AmbientesService {
  /**
   * Listar ambientes, opcionalmente filtrados por tipo
   */
  static async listar(tipo?: string) {
    const where: any = { activo: true };
    if (tipo) where.tipo = tipo;
    return prisma.ambiente.findMany({
      where,
      orderBy: { codigo: 'asc' },
    });
  }

  /**
   * Obtener un ambiente por ID con sus relaciones
   */
  static async obtenerPorId(id: number) {
    return prisma.ambiente.findUnique({
      where: { id },
      include: {
        cursos_asignados: {
          include: { curso: true },
        },
        horarios: {
          include: {
            curso: true,
            docente: true,
          },
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
        mantenimientos: {
          where: {
            fecha_fin: { gte: new Date() },
          },
          orderBy: { fecha_inicio: 'asc' },
        },
      },
    });
  }

  /**
   * Crear un nuevo ambiente
   */
  static async crear(datos: {
    codigo: string;
    tipo: string;
    capacidad: number;
    piso?: number;
    equipamiento?: string;
  }) {
    return prisma.ambiente.create({
      data: {
        codigo: datos.codigo,
        tipo: datos.tipo,
        capacidad: datos.capacidad,
        piso: datos.piso,
        equipamiento: datos.equipamiento,
      },
    });
  }

  /**
   * Actualizar un ambiente existente
   */
  static async actualizar(id: number, datos: any) {
    return prisma.ambiente.update({
      where: { id },
      data: datos,
    });
  }

  /**
   * Desactivar un ambiente (soft delete)
   */
  static async eliminar(id: number) {
    return prisma.ambiente.update({
      where: { id },
      data: { activo: false },
    });
  }

  /**
   * Reactivar un ambiente
   */
  static async reactivar(id: number) {
    return prisma.ambiente.update({
      where: { id },
      data: { activo: true },
    });
  }

  /**
   * Listar ambientes por tipo
   */
  static async listarPorTipo(tipo: string) {
    return prisma.ambiente.findMany({
      where: { tipo, activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  /**
   * Obtener disponibilidad de un ambiente en una fecha específica
   */
  static async obtenerDisponibilidad(id: number, fecha: Date) {
    const ambiente = await prisma.ambiente.findUnique({
      where: { id },
      include: {
        horarios: {
          where: {
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
          include: {
            curso: true,
            docente: true,
          },
        },
        mantenimientos: {
          where: {
            fecha_inicio: { lte: fecha },
            fecha_fin: { gte: fecha },
          },
        },
      },
    });

    if (!ambiente) throw new Error('Ambiente no encontrado');
    return ambiente;
  }

  static async obtenerDisponibilidadDeclarada(idAmbiente: number) {
    return prisma.disponibilidad_ambiente.findMany({
      where: { id_ambiente: idAmbiente },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  static async guardarDisponibilidadDeclarada(
    idAmbiente: number,
    disponibilidad: Array<{
      diaSemana: string;
      horaInicio: string;
      horaFin: string;
      disponible: boolean;
    }>
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.disponibilidad_ambiente.deleteMany({ where: { id_ambiente: idAmbiente } });
      if (disponibilidad.length > 0) {
        await tx.disponibilidad_ambiente.createMany({
          data: disponibilidad.map((item) => ({
            id_ambiente: idAmbiente,
            dia_semana: item.diaSemana,
            hora_inicio: item.horaInicio,
            hora_fin: item.horaFin,
            disponible: item.disponible,
          })),
        });
      }
    });

    return this.obtenerDisponibilidadDeclarada(idAmbiente);
  }

  /**
   * Verificar disponibilidad general de todos los ambientes (para matrices)
   */
  static async obtenerDisponibilidadGeneral(idPeriodo: number) {
    const ambientes = await prisma.ambiente.findMany({
      where: { activo: true },
      include: {
        horarios: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
          select: {
            dia_semana: true,
            hora_inicio: true,
            hora_fin: true,
            tipo_clase: true,
          },
        },
      },
    });
    return ambientes;
  }

  /**
   * Registrar mantenimiento de un ambiente
   */
  static async registrarMantenimiento(
    idAmbiente: number,
    datos: { fecha_inicio: string; fecha_fin: string; descripcion?: string }
  ) {
    return prisma.mantenimiento.create({
      data: {
        id_ambiente: idAmbiente,
        fecha_inicio: new Date(datos.fecha_inicio),
        fecha_fin: new Date(datos.fecha_fin),
        descripcion: datos.descripcion,
      },
    });
  }

  /**
   * Eliminar un registro de mantenimiento
   */
  static async eliminarMantenimiento(id: number) {
    return prisma.mantenimiento.delete({ where: { id } });
  }
}