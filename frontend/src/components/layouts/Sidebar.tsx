'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utilidades';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  School,
  Clock,
  Activity,
  Settings,
  CalendarOff,
  CheckSquare,
  Eye,
  Send,
  BellRing,
  MapPin,
  FileDown,
  GraduationCap,
  LayoutGrid,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { usuario } = useAuthStore();
  
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const esDirector = usuario?.rol === 'DIRECTOR';
  const esSecretaria = usuario?.rol === 'SECRETARIA';

  const rutaActiva = (href: string) => {
    if (href === '/dashboard' || href === '/dashboard/admin') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const enlacesAdmin = [
    { href: '/dashboard/admin', etiqueta: 'Panel Admin', Icono: LayoutDashboard },
    { href: '/dashboard/periodos', etiqueta: 'Períodos Académicos', Icono: Calendar },
    { href: '/dashboard/usuarios', etiqueta: 'Cuentas de Usuario', Icono: Users },
    { href: '/dashboard/ambientes', etiqueta: 'Infraestructura/Aulas', Icono: School },
    { href: '/dashboard/cursos', etiqueta: 'Catálogo de Cursos', Icono: BookOpen },
    { href: '/dashboard/configuracion/restricciones', etiqueta: 'Reglas del Sistema', Icono: Settings },
    { href: '/dashboard/configuracion/dias-no-laborables', etiqueta: 'Feriados/No Laborables', Icono: CalendarOff },
  ];

  const enlacesDirector = [
    { href: '/dashboard/admin', etiqueta: 'Dashboard Gestión', Icono: LayoutDashboard },
    { href: '/dashboard/director/docentes', etiqueta: 'Gestión de Docentes', Icono: Users },
    { href: '/dashboard/director/oferta-academica', etiqueta: 'Oferta Académica', Icono: GraduationCap },
    { href: '/dashboard/director/oferta-ciclos', etiqueta: 'Oferta por Ciclos', Icono: LayoutGrid },
    { href: '/dashboard/director/carga-horaria', etiqueta: 'Asignación de Carga', Icono: Clock },
    { href: '/dashboard/director/solicitudes-aula', etiqueta: 'Solicitudes de Aula', Icono: MapPin },
    { href: '/dashboard/horarios', etiqueta: 'Generador Horarios', Icono: Calendar },
    { href: '/dashboard/horarios/publicar', etiqueta: 'Publicar Horarios', Icono: Send },
  ];

  const enlacesSecretaria = [
    { href: '/dashboard/secretaria', etiqueta: 'Dashboard', Icono: LayoutDashboard },
    { href: '/dashboard/secretaria/ambientes', etiqueta: 'Ambientes', Icono: School },
    { href: '/dashboard/secretaria/docentes', etiqueta: 'Docentes', Icono: Users },
    { href: '/dashboard/secretaria/cursos-asignados', etiqueta: 'Cursos asignados', Icono: BookOpen },
    { href: '/dashboard/secretaria/grupos', etiqueta: 'Grupos', Icono: Eye },
    { href: '/dashboard/secretaria/ventanas', etiqueta: 'Ventanas de Atención', Icono: Clock },
    { href: '/dashboard/secretaria/registro-horarios', etiqueta: 'Registro Manual', Icono: CheckSquare },
    { href: '/dashboard/secretaria/reportes', etiqueta: 'Reportes PDF/Excel', Icono: FileDown },
    { href: '/dashboard/horarios/vista-aula', etiqueta: 'Horario por Aulas', Icono: MapPin },
    { href: '/dashboard/horarios/vista-ciclo', etiqueta: 'Horario por Ciclo', Icono: Calendar },
  ];

  const enlacesDocente = [
    { href: '/dashboard/docente', etiqueta: 'Mi Dashboard', Icono: LayoutDashboard },
    { href: '/dashboard/horarios/seleccion', etiqueta: 'Elegir mi Horario', Icono: CheckSquare },
    { href: '/dashboard/horarios/vista-docente', etiqueta: 'Ver mi Horario', Icono: Eye },
    { href: '/dashboard/notificaciones/preferencias', etiqueta: 'Mis Notificaciones', Icono: BellRing },
  ];

  let enlaces = enlacesDocente;
  if (esAdmin) enlaces = enlacesAdmin;
  else if (esDirector) enlaces = enlacesDirector;
  else if (esSecretaria) enlaces = enlacesSecretaria;

  return (
    <aside className="z-20 flex w-64 flex-col bg-unt-primary text-white shadow-xl transition-all duration-300">
      <div className="flex flex-col items-center justify-center space-y-2 border-b border-white/10 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-unt-accent shadow-lg shadow-unt-accent/20">
          <School className="h-7 w-7 text-unt-primary" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-wide text-white">Horarios UNT</h2>
          <p className="text-xs font-medium text-unt-accent">Esc. Ing. de Sistemas</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6 custom-scrollbar">
        {enlaces.map((enlace) => {
          const activo = rutaActiva(enlace.href);
          const Icon = enlace.Icono;

          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm transition-all duration-200',
                activo
                  ? 'border-unt-accent bg-white/10 font-semibold text-white shadow-inner'
                  : 'border-transparent text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  activo ? 'text-unt-accent' : 'text-gray-400 group-hover:text-unt-accent group-hover:scale-110'
                )}
                strokeWidth={activo ? 2.5 : 2}
              />
              <span>{enlace.etiqueta}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 text-center text-xs text-gray-400">
        <p>Versión 1.0.0</p>
      </div>
    </aside>
  );
}
