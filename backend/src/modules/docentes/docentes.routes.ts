import { Router, type Router as ExpressRouter } from 'express';
import { DocentesController } from './docentes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

router.get('/', DocentesController.listar);
router.post('/', DocentesController.crear);
router.get('/buscar', DocentesController.buscar);
router.get('/categoria/:modalidad/:categoria', DocentesController.porCategoria);
router.get('/:id', DocentesController.obtener);
router.put('/:id', DocentesController.actualizar);
router.delete('/:id', DocentesController.eliminar);
router.put('/:id/reactivar', DocentesController.reactivar);

export default router;