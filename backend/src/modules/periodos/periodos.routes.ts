import { Router } from 'express';
import { PeriodosController } from './periodos.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/', PeriodosController.listar);
router.get('/activo', PeriodosController.obtenerActivo);
router.post('/', PeriodosController.crear);
router.get('/:id', PeriodosController.obtener);
router.put('/:id', PeriodosController.actualizar);
router.delete('/:id', PeriodosController.eliminar);
router.patch('/:id/estado', PeriodosController.cambiarEstado);

export default router;