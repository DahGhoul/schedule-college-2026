'use client';
import { useAuthStore } from '@/stores/auth.store';
import { MenuUsuario } from './MenuUsuario';
import { Boton } from '@/components/ui/Boton';

export function BarraSuperior() {
  const { usuario, cerrarSesion } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">
          {usuario?.nombre || 'Panel de Administración'}
        </h1>
        <p className="text-sm text-gray-500">{usuario?.email}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
          {usuario?.rol}
        </span>
        <MenuUsuario />
        <Boton variante="secundario" onClick={cerrarSesion}>
          Cerrar Sesión
        </Boton>
      </div>
    </header>
  );
}