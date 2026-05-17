import { Router } from 'express';
import { AuthController } from './auth.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();

// Rutas públicas
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/recuperar-password', AuthController.recuperarPassword);

// Rutas protegidas (requieren token válido)
router.get('/me', middlewareAutenticacion, AuthController.me);
router.post('/cambiar-password', middlewareAutenticacion, AuthController.cambiarPassword);

export default router;