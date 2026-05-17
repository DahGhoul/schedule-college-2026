'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(onMensaje: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL + '/ws' || 'ws://localhost:4000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ tipo: 'suscribir_disponibilidad' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMensaje(data);
      } catch {}
    };

    return () => ws.close();
  }, [onMensaje]);

  return wsRef.current;
}