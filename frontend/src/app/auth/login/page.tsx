'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const { iniciarSesion, estaAutenticado, token, cargarSesion } = useAuthStore();

  useEffect(() => {
    if (token) {
      if (!estaAutenticado) {
        cargarSesion().then(() => {
          if (useAuthStore.getState().estaAutenticado) {
            router.push('/dashboard');
          }
        });
      } else {
        router.push('/dashboard');
      }
    }
  }, [token, estaAutenticado, router, cargarSesion]);

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Iniciar Sesión - Horarios UNT
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={manejarSubmit}>
            <CampoTexto
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <CampoTexto
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <NotificacionToast mensaje={error} tipo="error" />}
            <Boton type="submit" disabled={cargando} className="w-full">
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </Boton>
            <div className="text-sm text-center">
              <a href="/auth/recuperar-password" className="text-blue-600 hover:text-blue-500">
                ¿Olvidó su contraseña?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}