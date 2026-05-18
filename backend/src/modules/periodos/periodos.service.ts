import { prisma } from '@/lib/prisma';

export class PeriodosService {
  static async listar() {
    return prisma.periodo_academico.findMany({ where: { activo: true }, orderBy: { nombre: 'desc' } });
  }

  static async obtenerPorId(id: number) {
    return prisma.periodo_academico.findUnique({ where: { id } });
  }

  static async crear(datos: { nombre: string; fecha_inicio: string; fecha_fin: string }) {
    return prisma.periodo_academico.create({
      data: {
        nombre: datos.nombre,
        fecha_inicio: new Date(datos.fecha_inicio),
        fecha_fin: new Date(datos.fecha_fin),
      },
    });
  }

  static async actualizar(id: number, datos: any) {
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
    return prisma.periodo_academico.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.periodo_academico.update({ where: { id }, data: { activo: true } });
  }

  static async cambiarEstado(id: number, estado: string) {
    return prisma.periodo_academico.update({ where: { id }, data: { estado } });
  }

  static async obtenerActivo() {
    return prisma.periodo_academico.findFirst({ where: { estado: 'ACTIVO' } });
  }
}