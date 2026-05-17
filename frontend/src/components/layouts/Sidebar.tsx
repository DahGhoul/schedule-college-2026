'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utilidades'; // Asume que tienes esta función (puedes copiarla abajo)

const enlaces = [
  { href: '/dashboard', etiqueta: 'Dashboard', icono: '📊' },
  { href: '/dashboard/periodos', etiqueta: 'Períodos', icono: '📅' },
  { href: '/dashboard/docentes', etiqueta: 'Docentes', icono: '👨‍🏫' },
  { href: '/dashboard/cursos', etiqueta: 'Cursos', icono: '📚' },
  { href: '/dashboard/ambientes', etiqueta: 'Ambientes', icono: '🏫' },
  { href: '/dashboard/horarios/ventanas/configurar', etiqueta: 'Ventanas', icono: '🕒' },
  { href: '/dashboard/horarios/ventanas/monitorear', etiqueta: 'Monitor', icono: '📋' },
  { href: '/dashboard/configuracion/restricciones', etiqueta: 'Restricciones', icono: '⚙️' },
  { href: '/dashboard/configuracion/dias-no-laborables', etiqueta: 'Feriados', icono: '📆' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Horarios UNT</h2>
        <p className="text-sm text-gray-400">Esc. Ing. de Sistemas</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {enlaces.map((enlace) => {
          const activo = pathname === enlace.href || pathname.startsWith(enlace.href + '/');
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                activo
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span>{enlace.icono}</span>
              <span>{enlace.etiqueta}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        v1.0.0
      </div>
    </aside>
  );
}