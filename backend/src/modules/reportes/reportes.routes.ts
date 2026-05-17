import { Router } from 'express';
import { ReportesController } from './reportes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.post('/generar', ReportesController.generar);
router.get('/estado/:jobId', ReportesController.estadoDescarga);
router.get('/descargar/:jobId', ReportesController.descargar);

export default router;