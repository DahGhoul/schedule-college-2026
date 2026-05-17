'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function CambiarPasswordPage() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { cambiarPassword, token } = useAuthStore();

  if (typeof window !== 'undefined' && !token) {
    router.push('/auth/login');
    return null;
  }

  const manejarCambio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (nueva !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await cambiarPassword(actual, nueva);
      setMensaje('Contraseña actualizada exitosamente');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold text-gray-900">Cambiar Contraseña</h2>
        <form onSubmit={manejarCambio} className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
          <CampoTexto label="Contraseña actual" type="password" required value={actual} onChange={(e) => setActual(e.target.value)} />
          <CampoTexto label="Nueva contraseña" type="password" required value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <CampoTexto label="Confirmar nueva contraseña" type="password" required value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {mensaje && <NotificacionToast mensaje={mensaje} tipo="exito" />}
          {error && <NotificacionToast mensaje={error} tipo="error" />}
          <Boton type="submit" className="w-full">Actualizar Contraseña</Boton>
        </form>
      </div>
    </div>
  );
}