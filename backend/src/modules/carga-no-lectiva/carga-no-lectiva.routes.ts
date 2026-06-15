import { Router } from 'express';
import { middlewareAutenticacion } from '@/middleware/autenticacion';
import { CargaNoLectivaController } from './carga-no-lectiva.controller';

const router: Router = Router();

router.use(middlewareAutenticacion);

router.get('/mi/:id_periodo', CargaNoLectivaController.obtenerMiDeclaracion);
router.put('/mi/:id_periodo', CargaNoLectivaController.guardarMiDeclaracion);
router.delete('/mi/:id_periodo', CargaNoLectivaController.eliminarMiDeclaracion);

router.get('/mi/:id_periodo/horario', CargaNoLectivaController.obtenerMiHorarioNoLectivo);
router.put('/mi/:id_periodo/horario', CargaNoLectivaController.guardarMiHorarioNoLectivo);

export default router;