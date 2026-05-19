import { Router, type Router as ExpressRouter } from 'express';
import { VentanasController } from './ventanas.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();
router.use(middlewareAutenticacion);

router.post('/generar-automatica', VentanasController.generarAutomatica);
router.post('/configurar', VentanasController.configurar);
router.get('/', VentanasController.listar);
router.get('/activa', VentanasController.obtenerActiva);
router.get('/:id', VentanasController.obtener);
router.post('/:id/iniciar', VentanasController.iniciar);
router.get('/:id/cola', VentanasController.obtenerCola);
router.post('/:id/siguiente-docente', VentanasController.siguienteDocente);
router.post('/:id/marcar-atendido', VentanasController.marcarAtendido);

export default router;