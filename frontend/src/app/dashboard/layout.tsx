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
      const rutasAdmin = ['/admin', '/ambientes', '/configuracion', '/cursos', '/docentes', '/periodos', '/reportes'];
      const esRutaAdmin = rutasAdmin.some((ruta) => pathname.startsWith(`/dashboard${ruta}`));
      const esRutaDocente = pathname.startsWith('/dashboard/docente');

      if (usuario.rol !== 'ADMINISTRADOR' && (esRutaAdmin || pathname === '/dashboard')) {
        router.replace('/dashboard/docente');
      }

      if (usuario.rol === 'ADMINISTRADOR' && esRutaDocente) {
        router.replace('/dashboard/admin');
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