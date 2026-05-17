import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const cambiarPasswordSchema = z.object({
  contrasenaActual: z.string().min(1, 'Campo requerido'),
  nuevaContrasena: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const recuperarPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});