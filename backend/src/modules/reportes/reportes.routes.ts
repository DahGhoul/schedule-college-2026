import { Router, type Router as ExpressRouter } from 'express';
import { ReportesController } from './reportes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

// ---- New direct-download endpoints ----
router.get('/docente/:idDocente/pdf', ReportesController.pdfDocente);
router.get('/docente/:idDocente/excel', ReportesController.excelDocente);
router.get('/dia/:dia/pdf', ReportesController.pdfDia);
router.get('/dia/:dia/excel', ReportesController.excelDia);
router.get('/ciclo/:idCiclo/excel', ReportesController.excelCiclo);
router.get('/ciclo/:idCiclo/pdf', ReportesController.pdfCiclo);
router.get('/ambiente/:idAmbiente/pdf', ReportesController.pdfAmbiente);
router.get('/ambiente/:idAmbiente/excel', ReportesController.excelAmbiente);
router.get('/todos-los-ciclos/excel', ReportesController.excelTodosLosCiclos);
router.get('/todos-los-ciclos/pdf', ReportesController.pdfTodosLosCiclos);
router.get('/todos-los-ambientes/excel', ReportesController.excelTodosLosAmbientes);
router.get('/todos-los-ambientes/pdf', ReportesController.pdfTodosLosAmbientes);
router.get('/global/pdf', ReportesController.pdfGlobal);
router.get('/global/excel', ReportesController.excelGlobal);

// ---- Email endpoints ----
router.post('/enviar-correo/docente/:idDocente', ReportesController.enviarCorreoDocente);
router.post('/enviar-correo/todos', ReportesController.enviarCorreosTodos);
// ---- Publish endpoint ----
router.post('/publicar', ReportesController.publicarPeriodo);

// ---- Legacy queue-based endpoints ----
router.get('/descargar-excel', ReportesController.descargarExcel);
router.post('/generar', ReportesController.generar);
router.get('/estado/:jobId', ReportesController.estadoDescarga);
router.get('/descargar/:jobId', ReportesController.descargar);

export default router;