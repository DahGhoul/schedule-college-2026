import { Router, type Router as ExpressRouter } from 'express';
import { AmbientesController } from './ambientes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

// Todas las rutas requieren autenticación
router.use(middlewareAutenticacion);

// Rutas generales (antes de las rutas con parámetros)
router.get('/disponibilidad-general', AmbientesController.disponibilidadGeneral);
router.get('/por-tipo/:tipo', AmbientesController.listarPorTipo);

// CRUD básico
router.get('/', AmbientesController.listar);
router.post('/', AmbientesController.crear);
router.get('/:id', AmbientesController.obtener);
router.put('/:id', AmbientesController.actualizar);
router.delete('/:id', AmbientesController.eliminar);
router.put('/:id/reactivar', AmbientesController.reactivar);

// Disponibilidad y mantenimiento
router.get('/:id/disponibilidad', AmbientesController.obtenerDisponibilidad);
router.get('/:id/disponibilidad-declarada', AmbientesController.obtenerDisponibilidadDeclarada);
router.put('/:id/disponibilidad-declarada', AmbientesController.guardarDisponibilidadDeclarada);
router.post('/:id/mantenimiento', AmbientesController.registrarMantenimiento);

export default router;