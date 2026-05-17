import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

// Reutilizamos la conexión de Redis existente
const conexionRedis = { connection: redis };

export const colaReportes = new Queue('reportes', conexionRedis);