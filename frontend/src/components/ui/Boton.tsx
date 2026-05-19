import React, { forwardRef } from 'react';
import { cn } from '@/lib/utilidades';
import { Loader2 } from 'lucide-react';

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'borde' | 'outline';
  tamano?: 'sm' | 'md' | 'lg';
  size?: 'sm' | 'md' | 'lg'; // Alias para compatibilidad
  variant?: 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'borde' | 'outline'; // Alias
  cargando?: boolean;
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(
  ({ variante, variant, tamano, size, cargando, className, children, ...props }, ref) => {
    const v = variante || variant || 'primario';
    const s = tamano || size || 'md';

    const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantes = {
      primario: 'bg-unt-primary text-white hover:bg-[#002244] shadow-sm hover:shadow-md focus:ring-unt-primary',
      secundario: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300',
      peligro: 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow focus:ring-red-500',
      fantasma: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      borde: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
      outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
    };

    const tamanos = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base',
    };
    
    return (
      <button
        ref={ref}
        className={cn(base, variantes[v as keyof typeof variantes], tamanos[s as keyof typeof tamanos], className)}
        disabled={cargando || props.disabled}
        {...props}
      >
        {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Boton.displayName = 'Boton';
