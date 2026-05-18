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
  BellRing
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  // Configuración de enlaces por rol
  const enlacesAdmin = [
    { href: '/dashboard', etiqueta: 'Dashboard', Icono: LayoutDashboard },
    { href: '/dashboard/periodos', etiqueta: 'Períodos', Icono: Calendar },
    { href: '/dashboard/docentes', etiqueta: 'Docentes', Icono: Users },
    { href: '/dashboard/usuarios', etiqueta: 'Usuarios', Icono: Users },
    { href: '/dashboard/cursos', etiqueta: 'Cursos', Icono: BookOpen },
    { href: '/dashboard/ambientes', etiqueta: 'Ambientes', Icono: School },
    { href: '/dashboard/horarios/ventanas/configurar', etiqueta: 'Ventanas', Icono: Clock },
    { href: '/dashboard/horarios/ventanas/monitorear', etiqueta: 'Monitor Ventanas', Icono: Activity },
    { href: '/dashboard/horarios/vista-docente', etiqueta: 'Horario Docentes', Icono: Eye },
    { href: '/dashboard/horarios/vista-aula', etiqueta: 'Horario Aulas', Icono: Eye },
    { href: '/dashboard/horarios/publicar', etiqueta: 'Publicar Horarios', Icono: Send },
    { href: '/dashboard/configuracion/restricciones', etiqueta: 'Restricciones', Icono: Settings },
    { href: '/dashboard/configuracion/dias-no-laborables', etiqueta: 'Feriados', Icono: CalendarOff },
  ];

  const enlacesDocente = [
    { href: '/dashboard', etiqueta: 'Dashboard', Icono: LayoutDashboard },
    { href: '/dashboard/disponibilidad', etiqueta: 'Mi Disponibilidad', Icono: Calendar },
    { href: '/dashboard/horarios/seleccion', etiqueta: 'Elegir Horario', Icono: CheckSquare },
    { href: '/dashboard/horarios/vista-docente', etiqueta: 'Mi Horario', Icono: Eye },
    { href: '/dashboard/notificaciones/preferencias', etiqueta: 'Notificaciones', Icono: BellRing },
  ];

  const enlaces = esAdmin ? enlacesAdmin : enlacesDocente;

  return (
    <aside className="w-64 bg-unt-primary text-white flex flex-col shadow-xl z-20 transition-all duration-300">
      <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center space-y-2">
        <div className="w-12 h-12 bg-unt-accent rounded-xl flex items-center justify-center shadow-lg shadow-unt-accent/20">
          <School className="text-unt-primary w-7 h-7" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-wide text-white">Horarios UNT</h2>
          <p className="text-xs text-unt-accent font-medium">Esc. Ing. de Sistemas</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
        {enlaces.map((enlace) => {
          const activo = pathname === enlace.href || pathname.startsWith(enlace.href + '/');
          const Icon = enlace.Icono;
          
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                activo
                  ? 'bg-white/10 text-white font-semibold shadow-inner border-l-4 border-unt-accent'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-transform duration-200", 
                  activo ? "text-unt-accent" : "text-gray-400 group-hover:text-unt-accent group-hover:scale-110"
                )} 
                strokeWidth={activo ? 2.5 : 2}
              />
              <span>{enlace.etiqueta}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs text-center text-gray-400">
        <p>Versión 1.0.0</p>
      </div>
    </aside>
  );
}
