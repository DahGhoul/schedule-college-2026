import { Router } from 'express';
import { NotificacionesController } from './notificaciones.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/preferencias/:docenteId', NotificacionesController.obtenerPreferencias);
router.put('/preferencias/:docenteId', NotificacionesController.actualizarPreferencias);
router.post('/verificar-whatsapp', NotificacionesController.verificarWhatsApp);
router.post('/vincular-telegram', NotificacionesController.vincularTelegram);
router.post('/enviar', NotificacionesController.enviar);
router.get('/historial', NotificacionesController.historial);

export default router;