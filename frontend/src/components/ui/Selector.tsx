import React, { forwardRef } from 'react';
import { cn } from '@/lib/utilidades';
import { ChevronDown } from 'lucide-react';

export interface SelectorProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  opciones?: { valor: string | number; etiqueta: string }[];
  error?: string;
}

export const Selector = forwardRef<HTMLSelectElement, SelectorProps>(
  ({ label, opciones, children, className, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 relative">
        {label && <label className="block text-sm font-bold text-gray-700 ml-1">{label}</label>}
        <div className="relative group">
          <select
            ref={ref}
            className={cn(
              "block w-full appearance-none rounded-2xl border border-gray-200 px-4 py-4 text-gray-900 shadow-sm transition-all duration-200 focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none bg-slate-50/50 hover:bg-white cursor-pointer",
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500/5" : "hover:border-gray-300",
              className
            )}
            {...props}
          >
            {opciones?.length ? opciones.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.etiqueta}
              </option>
            )) : children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs font-bold text-red-600 ml-1">{error}</p>}
      </div>
    );
  }
);

Selector.displayName = 'Selector';
