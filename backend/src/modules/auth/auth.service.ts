import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { configuracionJWT } from '@/config/jwt';
import { Credenciales, DatosUsuario, TokenPayload, TokenPair } from './auth.types';

export class AuthService {
  /**
   * Verifica credenciales y devuelve datos del usuario
   */
  static async validarCredenciales(credenciales: Credenciales): Promise<DatosUsuario> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: credenciales.email },
      include: { docente: true },
    });

    if (!usuario || !usuario.activo) {
      throw new Error('Credenciales inválidas');
    }

    const valida = await bcrypt.compare(credenciales.password, usuario.hash_contrasena);
    if (!valida) {
      throw new Error('Credenciales inválidas');
    }

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acceso: new Date() },
    });

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.docente ? `${usuario.docente.nombres} ${usuario.docente.apellidos}` : undefined,
      idDocente: usuario.id_docente ?? undefined,
    };
  }

  /**
   * Genera el par de tokens (access + refresh)
   */
  static generarTokens(payload: TokenPayload): TokenPair {
    const token = jwt.sign(payload, configuracionJWT.secreto, {
      expiresIn: configuracionJWT.expiracion,
    });

    const refreshToken = jwt.sign(payload, configuracionJWT.secreto, {
      expiresIn: configuracionJWT.expiracionRefresh,
    });

    return { token, refreshToken };
  }

  /**
   * Verifica un token de acceso
   */
  static verificarToken(token: string): TokenPayload {
    return jwt.verify(token, configuracionJWT.secreto) as TokenPayload;
  }

  /**
   * Cambia la contraseña del usuario autenticado
   */
  static async cambiarPassword(
    usuarioId: number,
    contrasenaActual: string,
    nuevaContrasena: string
  ): Promise<void> {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new Error('Usuario no encontrado');

    const valida = await bcrypt.compare(contrasenaActual, usuario.hash_contrasena);
    if (!valida) throw new Error('Contraseña actual incorrecta');

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 12);
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { hash_contrasena: nuevoHash },
    });
  }

  /**
   * Simula la recuperación de contraseña (envío de enlace)
   */
  static async recuperarPassword(email: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      // Por seguridad no indicamos si existe
      return;
    }
    // Aquí se generaría un token de un solo uso y se enviaría por correo.
    // Como el módulo de notificaciones aún no existe, lo dejamos simulado.
    console.log(`Enlace de recuperación generado para ${email}`);
  }

  /**
   * Obtiene los datos del usuario por ID
   */
  static async obtenerUsuario(usuarioId: number): Promise<DatosUsuario | null> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { docente: true },
    });
    if (!usuario) return null;

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.docente ? `${usuario.docente.nombres} ${usuario.docente.apellidos}` : undefined,
      idDocente: usuario.id_docente ?? undefined,
    };
  }
}