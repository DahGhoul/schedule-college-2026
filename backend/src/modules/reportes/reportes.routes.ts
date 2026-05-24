import { Router, type Router as ExpressRouter } from 'express';
import { ReportesController } from './reportes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

// ---- New direct-download endpoints ----
router.get('/docente/:idDocente/pdf', ReportesController.pdfDocente);
router.get('/docente/:idDocente/excel', ReportesController.excelDocente);
router.get('/ciclo/:idCiclo/excel', ReportesController.excelCiclo);
router.get('/todos-los-ciclos/excel', ReportesController.excelTodosLosCiclos);
router.get('/global/pdf', ReportesController.pdfGlobal);
router.get('/global/excel', ReportesController.excelGlobal);

// ---- Email endpoints ----
router.post('/enviar-correo/docente/:idDocente', ReportesController.enviarCorreoDocente);
router.post('/enviar-correo/todos', ReportesController.enviarCorreosTodos);

// ---- Legacy queue-based endpoints ----
router.get('/descargar-excel', ReportesController.descargarExcel);
router.post('/generar', ReportesController.generar);
router.get('/estado/:jobId', ReportesController.estadoDescarga);
router.get('/descargar/:jobId', ReportesController.descargar);

export default router;