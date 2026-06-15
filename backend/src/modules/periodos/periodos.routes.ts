import { Router, type Router as ExpressRouter } from 'express';
import { PeriodosController } from './periodos.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

router.get('/', PeriodosController.listar);
router.get('/activo', PeriodosController.obtenerActivo);
router.get('/activo/ciclos', PeriodosController.obtenerCiclosActivo);
router.get('/:id/ciclos', PeriodosController.obtenerCiclos);
router.post('/', PeriodosController.crear);
router.get('/:id', PeriodosController.obtener);
router.put('/:id', PeriodosController.actualizar);
router.delete('/:id', PeriodosController.eliminar);
router.put('/:id/reactivar', PeriodosController.reactivar);
router.patch('/:id/estado', PeriodosController.cambiarEstado);

export default router;