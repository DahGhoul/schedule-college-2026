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
    console.log('[UsuariosService] Creando usuario con datos:', { ...datos, password: '***' });
    const hash = await bcrypt.hash(datos.password, 12);
    try {
      const result = await prisma.usuario.create({
        data: {
          email: datos.email.toLowerCase().trim(),
          hash_contrasena: hash,
          rol: datos.rol,
          id_docente: datos.id_docente,
        },
        include: { docente: true },
      });
      console.log('[UsuariosService] Usuario creado exitosamente:', result.id);
      return result;
    } catch (err: any) {
      console.error('[UsuariosService] Error en prisma.usuario.create:', err);
      throw err;
    }
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
