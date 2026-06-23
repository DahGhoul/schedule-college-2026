import { prisma } from '@/lib/prisma';

export class CurriculaService {
  static async listar() {
    return prisma.curricula.findMany({
      where: { activo: true },
      orderBy: { vigente: 'desc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.curricula.findUnique({ where: { id } });
  }

  static async obtenerVigente() {
    return prisma.curricula.findFirst({ where: { vigente: true, activo: true } });
  }

  static async crear(datos: { codigo: string; nombre: string; vigente?: boolean }) {
    const esVigente = datos.vigente === true;
    return prisma.$transaction(async (tx) => {
      if (esVigente) {
        await tx.curricula.updateMany({ where: { vigente: true }, data: { vigente: false } });
      }
      return tx.curricula.create({ data: { codigo: datos.codigo, nombre: datos.nombre, vigente: esVigente } });
    });
  }

  static async actualizar(id: number, datos: any) {
    return prisma.$transaction(async (tx) => {
      if (datos.vigente === true) {
        await tx.curricula.updateMany({ where: { vigente: true, id: { not: id } }, data: { vigente: false } });
      }
      return tx.curricula.update({ where: { id }, data: datos });
    });
  }

  static async eliminar(id: number) {
    return prisma.curricula.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.curricula.update({ where: { id }, data: { activo: true } });
  }
}
