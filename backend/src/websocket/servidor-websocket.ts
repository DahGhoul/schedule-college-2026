import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { redis } from '@/lib/redis';

let wss: WebSocketServer;

export function iniciarWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Cliente WebSocket conectado');

    ws.on('message', (data: string) => {
      try {
        const mensaje = JSON.parse(data);
        if (mensaje.tipo === 'suscribir_disponibilidad') {
          (ws as any).canal = 'disponibilidad';
        }
      } catch {}
    });

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
    });
  });

  // Suscribirse al canal de Redis para disponibilidad
  const subscriber = redis.duplicate();
  subscriber.subscribe('canal:disponibilidad');
  subscriber.on('message', (canal: string, mensaje: string) => {
    if (canal === 'canal:disponibilidad') {
      wss.clients.forEach((cliente) => {
        if (cliente.readyState === WebSocket.OPEN) {
          cliente.send(mensaje);
        }
      });
    }
  });
}