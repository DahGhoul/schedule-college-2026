import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export class DocentesService {
  static async listar(params: { modalidad?: string; categoria?: string; buscar?: string }) {
    const where: any = {};
    if (params.modalidad) where.modalidad = params.modalidad;
    if (params.categoria) where.categoria = params.categoria;
    if (params.buscar) {
      where.OR = [
        { nombres: { contains: params.buscar, mode: 'insensitive' } },
        { apellidos: { contains: params.buscar, mode: 'insensitive' } },
        { email: { contains: params.buscar, mode: 'insensitive' } },
      ];
    }
    return prisma.docente.findMany({ where, orderBy: [{ modalidad: 'asc' }, { categoria: 'asc' }, { antiguedad: 'desc' }] });
  }

  static async obtenerPorId(id: number) {
    return prisma.docente.findUnique({ where: { id }, include: { usuario: true } });
  }

  static async crear(datos: any) {
    const docente = await prisma.docente.create({
      data: {
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        email: datos.email,
        telefono: datos.telefono,
        modalidad: datos.modalidad,
        categoria: datos.categoria,
        antiguedad: datos.antiguedad ?? 0,
      },
    });

    if (datos.crear_usuario && datos.password) {
      const hash = await bcrypt.hash(datos.password, 12);
      await prisma.usuario.create({
        data: {
          email: datos.email,
          hash_contrasena: hash,
          rol: 'DOCENTE',
          id_docente: docente.id,
        },
      });
    }

    return docente;
  }

  static async actualizar(id: number, datos: any) {
    return prisma.docente.update({ where: { id }, data: datos });
  }

  static async eliminar(id: number) {
    return prisma.docente.update({ where: { id }, data: { activo: false } });
  }

  static async buscar(query: string) {
    return prisma.docente.findMany({
      where: {
        OR: [
          { nombres: { contains: query, mode: 'insensitive' } },
          { apellidos: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  static async porCategoria(categoria: string, modalidad: string) {
    return prisma.docente.findMany({
      where: { categoria, modalidad },
      orderBy: { antiguedad: 'desc' },
    });
  }
}