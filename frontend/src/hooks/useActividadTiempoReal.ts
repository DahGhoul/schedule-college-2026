'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface EventoActividad {
  tipo: string;
  [key: string]: any;
}

export function useActividadTiempoReal() {
  const [eventos, setEventos] = useState<EventoActividad[]>([]);

  const manejarMensaje = useCallback((data: any) => {
    if (data && data.tipo) {
      setEventos((prev) => [{ ...data, timestamp: new Date().toISOString() }, ...prev.slice(0, 19)]);
    }
  }, []);

  useWebSocket(manejarMensaje);

  return eventos;
}