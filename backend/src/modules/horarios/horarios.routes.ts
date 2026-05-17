import { Router } from 'express';
import { HorariosController } from './horarios.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

// Matriz de disponibilidad
router.get('/disponibilidad-matriz/:ambienteId', HorariosController.obtenerMatrizDisponibilidad);

// Selección temporal
router.post('/seleccionar-celda', HorariosController.seleccionarCelda);
router.post('/deseleccionar-celda', HorariosController.deseleccionarCelda);
router.get('/selecciones-temporales/:docenteId', HorariosController.obtenerSeleccionesTemporales);

// Validación
router.post('/validar-seleccion', HorariosController.validarSeleccion);

// Progreso
router.get('/progreso/:docenteId', HorariosController.obtenerProgreso);

// Confirmar, publicar, despublicar
router.post('/confirmar-seleccion', HorariosController.confirmarSeleccion);
router.post('/cambiar-estado', HorariosController.cambiarEstado);
router.post('/publicar', HorariosController.publicar);
router.post('/despublicar', HorariosController.despublicar);
router.get('/conflictos', HorariosController.obtenerConflictos);
router.get('/', HorariosController.listarHorarios);

export default router;