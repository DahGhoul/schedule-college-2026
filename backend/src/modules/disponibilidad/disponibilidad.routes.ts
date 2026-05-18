import { Router, type Router as ExpressRouter } from 'express';
import { DisponibilidadController } from './disponibilidad.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

router.get('/docente/:idDocente', middlewareAutenticacion, DisponibilidadController.obtenerPorDocente);
router.put('/docente/:idDocente', middlewareAutenticacion, DisponibilidadController.actualizarBatch);

export default router;
