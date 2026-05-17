import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { DatosUsuario } from '@/modules/auth/auth.types';

export async function middlewareAutenticacion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de acceso no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = AuthService.verificarToken(token);
    const usuario = await AuthService.obtenerUsuario(payload.id);
    if (!usuario) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }
    (req as any).usuario = usuario;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}