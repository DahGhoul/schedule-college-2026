'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layouts/Sidebar';
import { BarraSuperior } from '@/components/layouts/BarraSuperior';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useRefreshTokenSilent } from '@/hooks/useRefreshTokenSilent';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, estaCargando, token, usuario } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Refresh token silently
  useRefreshTokenSilent();

  // Wait until the component is mounted on the client to avoid server/client markup drift
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Redirect if no token (client‑only)
  useEffect(() => {
    if (mounted && !token) {
      router.push('/auth/login');
    }
  }, [mounted, token, router]);

  // Role‑based route protection (client‑only)
  useEffect(() => {
    if (!mounted) return;
    if (!estaAutenticado || !usuario) return;

    const rutasAdmin = ['/admin', '/ambientes', '/configuracion', '/cursos', '/docentes', '/periodos', '/reportes', '/director'];
    const esRutaAdmin = rutasAdmin.some((ruta) => pathname.startsWith(`/dashboard${ruta}`));
    const esRutaSecretaria = pathname.startsWith('/dashboard/secretaria');

    if (pathname === '/dashboard') {
      if (usuario.rol === 'DOCENTE') router.replace('/dashboard/docente');
      else if (usuario.rol === 'SECRETARIA') router.replace('/dashboard/secretaria');
      else router.replace('/dashboard/admin');
      return;
    }

    if (usuario.rol === 'DOCENTE' && (esRutaAdmin || esRutaSecretaria || pathname === '/dashboard/admin')) {
      router.replace('/dashboard/docente');
      return;
    }

    if (usuario.rol === 'SECRETARIA' && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/director'))) {
      router.replace('/dashboard/secretaria');
      return;
    }
  }, [mounted, estaAutenticado, usuario, pathname, router]);

  // While auth state is loading or before mounting, show a spinner that matches on server and client
  if (!mounted || estaCargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <SpinnerCarga />
      </div>
    );
  }

  // If still no token after mounting, render nothing (redirect will occur)
  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <BarraSuperior />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
