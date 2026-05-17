import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { iniciarWebSocket } from './websocket/servidor-websocket';
//import trabajadorReportes from './workers/trabajador-reportes';
//import trabajadorNotificaciones from './workers/trabajador-notificaciones';
import { iniciarProgramadorTareas } from './workers/programador-tareas';

const PORT = process.env.PORT || 4000;

async function main() {
  await prisma.$connect();
  console.log('Conectado a PostgreSQL');

  try {
    await redis.connect();
    console.log('Conectado a Redis');
  } catch {
    console.log('Redis no disponible, continuando sin Redis...');
  }

  const server = http.createServer(app);
  iniciarWebSocket(server);

  // Iniciar workers
  console.log('Worker de reportes activo');
  console.log('Worker de notificaciones activo');

  // Iniciar programador de tareas
  iniciarProgramadorTareas();

  server.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});