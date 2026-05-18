'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layouts/Sidebar';
import { BarraSuperior } from '@/components/layouts/BarraSuperior';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, estaCargando, token, cargarSesion, usuario } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (token && !estaAutenticado && !estaCargando) {
      cargarSesion();
    }
    if (!token) {
      router.push('/auth/login');
    }
  }, [token, estaAutenticado, estaCargando]);

  // Protección de rutas por rol
  useEffect(() => {
    if (estaAutenticado && usuario) {
      const rutasAdmin = ['/ambientes', '/configuracion', '/cursos', '/docentes', '/periodos', '/reportes'];
      const esRutaAdmin = rutasAdmin.some((ruta) => pathname.startsWith(`/dashboard${ruta}`));
      
      if (esRutaAdmin && usuario.rol !== 'ADMINISTRADOR') {
        // Si no es ADMIN y quiere entrar a algo restringido, mandarlo a su inicio
        router.replace('/dashboard');
      }
    }
  }, [estaAutenticado, usuario, pathname, router]);

  if (!estaAutenticado && token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <SpinnerCarga />
      </div>
    );
  }

  if (!estaAutenticado && !token) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <BarraSuperior />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}