import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export class UsuariosService {
  static async listar() {
    return prisma.usuario.findMany({
      include: { docente: true },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.usuario.findUnique({
      where: { id },
      include: { docente: true },
    });
  }

  static async crear(datos: {
    email: string;
    rol: string;
    password: string;
    id_docente?: number;
  }) {
    const hash = await bcrypt.hash(datos.password, 12);
    return prisma.usuario.create({
      data: {
        email: datos.email,
        hash_contrasena: hash,
        rol: datos.rol,
        id_docente: datos.id_docente,
      },
      include: { docente: true },
    });
  }

  static async actualizar(
    id: number,
    datos: {
      email?: string;
      rol?: string;
      password?: string;
      id_docente?: number | null;
      activo?: boolean;
    }
  ) {
    const updateData: any = {};

    if (datos.email) updateData.email = datos.email;
    if (datos.rol) updateData.rol = datos.rol;
    if (datos.password) {
      updateData.hash_contrasena = await bcrypt.hash(datos.password, 12);
    }
    if (datos.id_docente !== undefined) updateData.id_docente = datos.id_docente;
    if (datos.activo !== undefined) updateData.activo = datos.activo;

    return prisma.usuario.update({
      where: { id },
      data: updateData,
      include: { docente: true },
    });
  }

  static async eliminar(id: number) {
    return prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  static async reactivar(id: number) {
    return prisma.usuario.update({
      where: { id },
      data: { activo: true },
    });
  }
}
