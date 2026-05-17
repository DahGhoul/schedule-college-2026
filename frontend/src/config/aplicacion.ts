// frontend/src/config/aplicacion.ts
export const configuracionApp = {
  nombre: 'Horarios UNT',
  version: '1.0.0',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
};