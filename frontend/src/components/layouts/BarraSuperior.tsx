'use client';
import { useAuthStore } from '@/stores/auth.store';
import { MenuUsuario } from './MenuUsuario';
import { Boton } from '@/components/ui/Boton';
import { LogOut, Bell } from 'lucide-react';

export function BarraSuperior() {
  const { usuario, cerrarSesion } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">
            {usuario?.nombre || 'Panel de Administración'}
          </h1>
          <p className="text-sm text-gray-500 font-medium">{usuario?.email}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider bg-unt-accent/20 text-unt-primary px-3 py-1 rounded-full border border-unt-accent/30">
            {usuario?.rol || 'Administrador'}
          </span>
          <button className="p-2 text-gray-400 hover:text-unt-primary transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-unt-secondary rounded-full"></span>
          </button>
        </div>
        
        <div className="h-8 w-px bg-gray-200"></div>

        <div className="flex items-center gap-4">
          <MenuUsuario />
          <Boton variante="fantasma" onClick={cerrarSesion} className="!text-red-500 hover:!bg-red-50 hover:!text-red-600 px-3">
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Boton>
        </div>
      </div>
    </header>
  );
}