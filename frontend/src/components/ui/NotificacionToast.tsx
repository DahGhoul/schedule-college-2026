import React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utilidades';

export interface NotificacionToastProps {
  mensaje: string;
  tipo: 'exito' | 'success' | 'error' | 'advertencia';
  onClose?: () => void;
}

export function NotificacionToast({ mensaje, tipo, onClose }: NotificacionToastProps) {
  const t = tipo === 'success' ? 'exito' : tipo;

  const estilos = {
    exito: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    advertencia: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };

  const Iconos = {
    exito: CheckCircle2,
    error: AlertCircle,
    advertencia: AlertTriangle,
  };

  const Icono = Iconos[t];

  return (
    <div 
      className={cn(
        "fixed bottom-8 right-8 p-5 rounded-2xl border shadow-2xl z-[200] max-w-md animate-in slide-in-from-right-10 duration-300",
        estilos[t]
      )}
    >
      <div className="flex items-start gap-4">
        <Icono className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold leading-tight">{mensaje}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}