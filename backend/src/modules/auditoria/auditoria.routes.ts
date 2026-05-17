import { Router } from 'express';
import { AuditoriaController } from './auditoria.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/', AuditoriaController.listar);
router.get('/horario/:idHorario', AuditoriaController.obtenerPorHorario);

export default router;