import { Router, type Router as ExpressRouter } from 'express';
import { UsuariosController } from './usuarios.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

router.get('/', middlewareAutenticacion, UsuariosController.listar);
router.get('/:id', middlewareAutenticacion, UsuariosController.obtenerPorId);
router.post('/', middlewareAutenticacion, UsuariosController.crear);
router.put('/:id', middlewareAutenticacion, UsuariosController.actualizar);
router.delete('/:id', middlewareAutenticacion, UsuariosController.eliminar);
router.put('/:id/reactivar', middlewareAutenticacion, UsuariosController.reactivar);

export default router;
