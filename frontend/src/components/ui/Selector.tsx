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
      <div className="space-y-2 w-full">
        {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
        <div className="relative group h-[52px]">
          <select
            ref={ref}
            className={cn(
              "block w-full h-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium normal-case text-slate-600 transition-all duration-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none cursor-pointer hover:border-slate-300 truncate",
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "",
              className
            )}
            {...props}
          >
            {opciones?.length ? opciones.map((op) => (
              <option key={op.valor} value={op.valor} className="font-sans text-sm normal-case tracking-normal py-2 truncate">
                {op.etiqueta}
              </option>
            )) : children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-[10px] font-bold text-red-600 ml-1">{error}</p>}
      </div>
    );
  }
);

Selector.displayName = 'Selector';
