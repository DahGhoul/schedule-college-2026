import { Router } from 'express';
import { EstadisticasController } from './estadisticas.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/resumen', EstadisticasController.resumen);
router.get('/avance-categoria', EstadisticasController.avanceCategoria);
router.get('/ocupacion-ambientes', EstadisticasController.ocupacionAmbientes);
router.get('/mapa-calor', EstadisticasController.mapaCalor);
router.get('/carga-docente', EstadisticasController.cargaDocente);

export default router;