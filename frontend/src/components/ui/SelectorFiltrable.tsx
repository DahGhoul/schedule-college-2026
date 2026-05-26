import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utilidades';
import { Search, ChevronDown, X } from 'lucide-react';

interface Opcion {
  valor: string | number;
  etiqueta: string;
}

interface SelectorFiltrableProps {
  label: string;
  opciones: Opcion[];
  value: string | number;
  onChange: (valor: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectorFiltrable({
  label,
  opciones,
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  disabled
}: SelectorFiltrableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const opcionSeleccionada = opciones.find(op => op.valor === value);

  const opcionesFiltradas = opciones.filter(op =>
    op.etiqueta.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (valor: string | number) => {
    onChange(valor);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
      <label className="block text-sm font-bold text-gray-700 ml-1">{label}</label>
      
      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between w-full rounded-2xl border border-gray-200 px-4 py-4 text-gray-900 shadow-sm transition-all duration-200 bg-slate-50/50 hover:bg-white cursor-pointer",
            isOpen && "border-unt-primary ring-4 ring-unt-primary/5",
            disabled && "opacity-50 cursor-not-allowed bg-gray-100"
          )}
        >
          <span className={cn("truncate", !opcionSeleccionada && "text-gray-400")}>
            {opcionSeleccionada ? opcionSeleccionada.etiqueta : placeholder}
          </span>
          <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-3 border-b border-gray-50 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-unt-primary focus:ring-2 focus:ring-unt-primary/5"
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
              {opcionesFiltradas.length > 0 ? (
                opcionesFiltradas.map((op) => (
                  <div
                    key={op.valor}
                    onClick={() => handleSelect(op.valor)}
                    className={cn(
                      "px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-slate-50",
                      op.valor === value && "bg-unt-primary/5 text-unt-primary font-bold"
                    )}
                  >
                    {op.etiqueta}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-400 text-sm italic">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
