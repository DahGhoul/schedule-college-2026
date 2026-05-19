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
      const rutasAdmin = ['/admin', '/ambientes', '/configuracion', '/cursos', '/docentes', '/periodos', '/reportes', '/director'];
      const esRutaAdmin = rutasAdmin.some((ruta) => pathname.startsWith(`/dashboard${ruta}`));
      const esRutaDocente = pathname === '/dashboard/docente' || pathname.startsWith('/dashboard/docente/');
      const esRutaSecretaria = pathname.startsWith('/dashboard/secretaria');

      // Redirección inicial según rol
      if (pathname === '/dashboard') {
        if (usuario.rol === 'DOCENTE') {
          router.replace('/dashboard/docente');
        } else if (usuario.rol === 'SECRETARIA') {
          router.replace('/dashboard/secretaria/ambientes');
        } else {
          router.replace('/dashboard/admin');
        }
        return;
      }

      // Protección: Docente no puede entrar a admin o secretaria
      if (usuario.rol === 'DOCENTE' && (esRutaAdmin || esRutaSecretaria || pathname === '/dashboard/admin')) {
        router.replace('/dashboard/docente');
        return;
      }

      // Protección: Secretaria no puede entrar a admin puro o director
      if (usuario.rol === 'SECRETARIA' && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/director'))) {
        router.replace('/dashboard/secretaria/ambientes');
        return;
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
