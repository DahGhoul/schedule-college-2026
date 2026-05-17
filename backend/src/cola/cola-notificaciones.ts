import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const colaNotificaciones = new Queue('notificaciones', { connection: redis });