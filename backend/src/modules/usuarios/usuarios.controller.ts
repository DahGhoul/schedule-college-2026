import { Request, Response } from 'express';
import { UsuariosService } from './usuarios.service';
import { crearUsuarioSchema, actualizarUsuarioSchema } from './usuarios.schema';

export class UsuariosController {
  static async listar(req: Request, res: Response) {
    try {
      const usuarios = await UsuariosService.listar();
      res.json(usuarios);
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }

  static async obtenerPorId(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const usuario = await UsuariosService.obtenerPorId(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(usuario);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }

  static async crear(req: Request, res: Response) {
    try {
      console.log('[UsuariosController] Intentando crear usuario:', req.body);
      const datos = crearUsuarioSchema.parse(req.body) as any;
      const usuario = await UsuariosService.crear(datos);
      res.status(201).json(usuario);
    } catch (error: any) {
      console.error('[UsuariosController] Error al crear usuario:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      }
      res.status(500).json({ error: error.message || 'Error al crear usuario' });
    }
  }

  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarUsuarioSchema.parse(req.body);
      const usuario = await UsuariosService.actualizar(id, datos);
      res.json(usuario);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await UsuariosService.eliminar(id);
      res.json({ mensaje: 'Usuario desactivado exitosamente' });
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      res.status(500).json({ error: 'Error al desactivar usuario' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const usuario = await UsuariosService.reactivar(id);
      res.json(usuario);
    } catch (error) {
      console.error('Error al reactivar usuario:', error);
      res.status(500).json({ error: 'Error al reactivar usuario' });
    }
  }
}
