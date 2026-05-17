import { Router } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

// Restricciones
router.get('/restricciones', ConfiguracionController.obtenerRestricciones);
router.put('/restricciones', ConfiguracionController.actualizarRestricciones);

// Días no laborables
router.get('/dias-no-laborables', ConfiguracionController.listarDiasNoLaborables);
router.post('/dias-no-laborables', ConfiguracionController.crearDiaNoLaborable);
router.put('/dias-no-laborables/:id', ConfiguracionController.actualizarDiaNoLaborable);
router.delete('/dias-no-laborables/:id', ConfiguracionController.eliminarDiaNoLaborable);

export default router;