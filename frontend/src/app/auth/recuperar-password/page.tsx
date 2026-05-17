'use client';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await apiClient.post('/auth/recuperar-password', { email });
      setMensaje('Si el correo está registrado, recibirás un enlace de recuperación.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold text-gray-900">Recuperar Contraseña</h2>
        <form onSubmit={manejarEnvio} className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
          <CampoTexto
            label="Correo electrónico"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mensaje && <NotificacionToast mensaje={mensaje} tipo="exito" />}
          {error && <NotificacionToast mensaje={error} tipo="error" />}
          <Boton type="submit" className="w-full">Enviar enlace</Boton>
        </form>
      </div>
    </div>
  );
}