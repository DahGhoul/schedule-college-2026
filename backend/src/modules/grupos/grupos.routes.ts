import { Router } from 'express';
import { GruposController } from './grupos.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();

// Todas las rutas requieren autenticación
router.use(middlewareAutenticacion);

// Rutas generales
router.get('/por-curso/:cursoId', GruposController.listarPorCurso);

// CRUD básico
router.get('/', GruposController.listar);
router.post('/', GruposController.crear);
router.get('/:id', GruposController.obtener);
router.put('/:id', GruposController.actualizar);
router.delete('/:id', GruposController.eliminar);

export default router;