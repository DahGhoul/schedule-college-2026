import { Router, type Router as ExpressRouter } from 'express';
import { CurriculaController } from './curricula.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

router.use(middlewareAutenticacion);

router.get('/', CurriculaController.listar);
router.get('/vigente', CurriculaController.obtenerVigente);
router.post('/', CurriculaController.crear);
router.get('/:id', CurriculaController.obtener);
router.put('/:id', CurriculaController.actualizar);
router.delete('/:id', CurriculaController.eliminar);
router.put('/:id/reactivar', CurriculaController.reactivar);

export default router;
