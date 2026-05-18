import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, cambiarPasswordSchema, recuperarPasswordSchema } from './auth.schema';
import { Credenciales, DatosUsuario, TokenPayload } from './auth.types';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const datos = loginSchema.parse(req.body) as Credenciales;
      const usuario = await AuthService.validarCredenciales(datos);

      const payload: TokenPayload = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      };

      const tokens = AuthService.generarTokens(payload);

      res.json({
        ...tokens,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          nombre: usuario.nombre,
          idDocente: usuario.idDocente,
        },
      });
    } catch (error: any) {
      if (error.message === 'Credenciales inválidas') {
        res.status(401).json({ error: 'Credenciales inválidas' });
      } else if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  }

  /**
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token requerido' });
        return;
      }

      const payload = AuthService.verificarToken(refreshToken);
      const nuevoPayload: TokenPayload = {
        id: payload.id,
        email: payload.email,
        rol: payload.rol,
      };
      const tokens = AuthService.generarTokens(nuevoPayload);
      res.json(tokens);
    } catch (error: any) {
      res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
  }

  /**
   * GET /api/auth/me
   */
  static async me(req: Request, res: Response) {
    try {
      // El middleware agrega req.usuario
      const usuario = (req as any).usuario as DatosUsuario;
      res.json(usuario);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener datos del usuario' });
    }
  }

  /**
   * POST /api/auth/cambiar-password
   */
  static async cambiarPassword(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario as DatosUsuario;
      const datos = cambiarPasswordSchema.parse(req.body);
      await AuthService.cambiarPassword(usuario.id, datos.contrasenaActual, datos.nuevaContrasena);
      res.json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else if (error.message === 'Contraseña actual incorrecta') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno' });
      }
    }
  }

  /**
   * POST /api/auth/recuperar-password
   */
  static async recuperarPassword(req: Request, res: Response) {
    try {
      const datos = recuperarPasswordSchema.parse(req.body);
      await AuthService.recuperarPassword(datos.email);
      // Siempre respondemos igual para no revelar si el correo existe
      res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Correo inválido' });
      } else {
        res.status(500).json({ error: 'Error interno' });
      }
    }
  }
}