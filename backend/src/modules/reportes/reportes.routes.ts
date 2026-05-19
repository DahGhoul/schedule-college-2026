import { Router, type Router as ExpressRouter } from 'express';
import { ReportesController } from './reportes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

router.get('/descargar-excel', ReportesController.descargarExcel);
router.post('/generar', ReportesController.generar);
router.get('/estado/:jobId', ReportesController.estadoDescarga);
router.get('/descargar/:jobId', ReportesController.descargar);

export default router;