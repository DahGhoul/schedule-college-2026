import { Router, type Router as ExpressRouter } from 'express';
import { CursosController } from './cursos.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

// Todas las rutas requieren autenticación
router.use(middlewareAutenticacion);

// CRUD básico
router.get('/', CursosController.listar);
router.post('/', CursosController.crear);
router.get('/buscar', CursosController.buscar);
router.post('/importar', CursosController.importar);
router.get('/:id', CursosController.obtener);
router.put('/:id', CursosController.actualizar);
router.delete('/:id', CursosController.eliminar);
router.put('/:id/reactivar', CursosController.reactivar);

// Gestión de ambientes del curso
router.get('/:id/ambientes', CursosController.listarAmbientes);
router.post('/:id/ambientes', CursosController.agregarAmbiente);
router.delete('/:id/ambientes/:ambienteId/:tipoClase', CursosController.quitarAmbiente);

export default router;