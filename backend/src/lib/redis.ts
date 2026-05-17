/*import Redis from 'ioredis';
import { configuracionRedis } from '@/config/redis';

const redis = new Redis(configuracionRedis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Error Redis:', err.message);
});

redis.on('connect', () => {
  console.log('Conectado a Redis');
});

export { redis };*/

import Redis from 'ioredis';
import { configuracionRedis } from '@/config/redis';

const redis = new Redis(configuracionRedis.url, {
  lazyConnect: true,

  // Evita reconexiones infinitas
  retryStrategy() {
    return null;
  },

  // Evita errores MaxRetriesPerRequest
  maxRetriesPerRequest: null,

  enableOfflineQueue: false,
});

redis.on('error', () => {
  console.log('Redis no disponible.');
});

export { redis };