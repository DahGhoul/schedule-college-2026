'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';

export function MenuUsuario() {
  const [abierto, setAbierto] = useState(false);
  const { usuario } = useAuthStore();

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
      >
        <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          {usuario?.nombre?.charAt(0) || 'U'}
        </span>
        <span>{usuario?.nombre || usuario?.email}</span>
      </button>
      {abierto && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
          <Link
            href="/auth/cambiar-password"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setAbierto(false)}
          >
            Cambiar Contraseña
          </Link>
          <Link
            href="/dashboard/notificaciones/preferencias"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setAbierto(false)}
          >
            Preferencias Notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}