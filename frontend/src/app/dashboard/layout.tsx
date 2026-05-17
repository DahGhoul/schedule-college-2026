'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';// Asegurar que este componente exista

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, estaCargando, token, cargarSesion } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token && !estaAutenticado && !estaCargando) {
      cargarSesion();
    }
    if (!token) {
      router.push('/auth/login');
    }
  }, [token, estaAutenticado, estaCargando]);

  if (!estaAutenticado && token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <SpinnerCarga />
      </div>
    );
  }

  if (!estaAutenticado && !token) {
    return null; // router.push se encargará
  }

  return (
    <div className="flex">
      <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
        <h2 className="text-xl font-bold mb-4">Horarios UNT</h2>
        <nav className="space-y-1">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/periodos">Períodos</Link>
          <Link href="/dashboard/docentes">Docentes</Link>
          <Link href="/dashboard/cursos">Cursos</Link>
          <Link href="/dashboard/ambientes">Ambientes</Link>
          <Link href="/dashboard/horarios/ventanas/configurar">Configurar Ventanas</Link>
          <Link href="/dashboard/horarios/ventanas/monitorear">Monitor Ventanas</Link>
          <Link href="/dashboard/configuracion/restricciones">Restricciones</Link>
          <Link href="/dashboard/configuracion/dias-no-laborables">Días No Laborables</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}