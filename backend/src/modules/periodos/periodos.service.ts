import { prisma } from '@/lib/prisma';
import { TipoPeriodo } from './periodos.types';

export class PeriodosService {
  static async listar() {
    return prisma.periodo_academico.findMany({ orderBy: { nombre: 'desc' } });
  }

  static async obtenerPorId(id: number) {
    return prisma.periodo_academico.findUnique({ where: { id } });
  }

  static async crear(datos: { nombre: string; tipo: TipoPeriodo; fecha_inicio: string; fecha_fin: string }) {
    // 1. Create the period
    const periodo = await prisma.periodo_academico.create({
      data: {
        nombre: datos.nombre,
        tipo: datos.tipo,
        fecha_inicio: new Date(datos.fecha_inicio),
        fecha_fin: new Date(datos.fecha_fin),
      },
    });

    // 2. Create the necessary cycles
    const ciclosPermitidos = this.getNumerosCiclosPermitidos(datos.tipo);
    
    for (const numero of ciclosPermitidos) {
      await prisma.ciclo.upsert({
        where: {
          id_periodo_numero: {
            id_periodo: periodo.id,
            numero,
          },
        },
        update: {},
        create: {
          numero,
          nombre: `Ciclo ${numero}`,
          id_periodo: periodo.id,
        },
      });
    }

    return periodo;
  }

  static async actualizar(id: number, datos: any) {
    // If setting activo to true, make all others inactive
    if (datos.activo === true) {
      await prisma.periodo_academico.updateMany({
        data: { activo: false },
      });
    }

    return prisma.periodo_academico.update({
      where: { id },
      data: {
        ...datos,
        ...(datos.fecha_inicio && { fecha_inicio: new Date(datos.fecha_inicio) }),
        ...(datos.fecha_fin && { fecha_fin: new Date(datos.fecha_fin) }),
      },
    });
  }

  static async eliminar(id: number) {
    return prisma.periodo_academico.delete({ where: { id } });
  }

  static async reactivar(id: number) {
    // Set all others to inactive first
    await prisma.periodo_academico.updateMany({
      data: { activo: false },
    });

    return prisma.periodo_academico.update({ where: { id }, data: { activo: true } });
  }

  static async cambiarEstado(id: number, estado: string) {
    return prisma.periodo_academico.update({ where: { id }, data: { estado } });
  }

  static async obtenerActivo() {
    return prisma.periodo_academico.findFirst({ where: { activo: true } });
  }

  static async obtenerCiclosPorPeriodo(periodoId: number) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: periodoId } });
    if (!periodo) return [];

    // Define which cycle numbers are allowed based on period type
    let allowedNumbers: number[];
    switch (periodo.tipo) {
      case 'I':
        allowedNumbers = [1, 3, 5, 7, 9];
        break;
      case 'II':
        allowedNumbers = [2, 4, 6, 8, 10];
        break;
      case 'III':
        allowedNumbers = []; // Extraordinario, no cycles for now
        break;
      default:
        allowedNumbers = [];
    }

    return prisma.ciclo.findMany({
      where: {
        id_periodo: periodoId,
        numero: { in: allowedNumbers },
      },
      orderBy: { numero: 'asc' },
    });
  }

  // Helper to get allowed cycle numbers given a period type
  static getNumerosCiclosPermitidos(tipo: TipoPeriodo): number[] {
    switch (tipo) {
      case 'I':
        return [1, 3, 5, 7, 9];
      case 'II':
        return [2, 4, 6, 8, 10];
      case 'III':
        return [];
      default:
        return [];
    }
  }
}