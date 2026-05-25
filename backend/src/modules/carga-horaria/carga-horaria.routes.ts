import { Router } from 'express';
import { CargaHorariaController } from './carga-horaria.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();

// Todas las rutas de carga horaria requieren autenticación y idealmente rol DIRECTOR
router.use(middlewareAutenticacion);

router.post('/asignar', CargaHorariaController.asignarCarga);
router.get('/resumen/:id_periodo', CargaHorariaController.obtenerResumenCarga);
router.post('/configurar-oferta', CargaHorariaController.configurarOferta);
router.delete('/asignacion/:id_asignacion', CargaHorariaController.eliminarAsignacion);
router.delete('/oferta/:id', CargaHorariaController.eliminarOferta);
router.get('/ciclos/:id_periodo', CargaHorariaController.obtenerCiclosPorPeriodo);
router.get('/cursos/:id_periodo', CargaHorariaController.obtenerCursosPorCiclo);

export default router;
