'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utilidades';

export interface ModalProps {
  children: React.ReactNode;
  isOpen?: boolean;
  abierto?: boolean; // Alias
  onClose?: () => void;
  cerrar?: () => void; // Alias
  titulo?: string;
  title?: string; // Alias
  className?: string;
  classNameContenido?: string;
  overflowVisible?: boolean;
}

export function Modal({ 
  children, 
  isOpen, 
  abierto, 
  onClose, 
  cerrar, 
  titulo, 
  title,
  className,
  classNameContenido,
  overflowVisible = false
}: ModalProps) {
  const [montado, setMontado] = useState(false);

  // Soporte para ambas formas de apertura y cierre
  const show = isOpen !== undefined ? isOpen : (abierto !== undefined ? abierto : false);
  const handleClose = onClose || cerrar || (() => {});
  const displayTitle = titulo || title;

  useEffect(() => {
    setMontado(true);
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    if (show) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [show, handleClose]);

  if (!montado || !show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div 
        className={cn(
          "relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg transition-all duration-300",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-slate-50/50 rounded-t-[2.5rem]">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            {displayTitle}
          </h3>
          <button 
            onClick={handleClose} 
            className="group p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-gray-100"
          >
            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>

        {/* Body */}
        <div className={cn(
          "p-8",
          !overflowVisible ? "max-h-[75vh] overflow-y-auto custom-scrollbar" : "overflow-visible",
          classNameContenido
        )}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
