import { redis } from '@/lib/redis';

export async function obtenerClavesPorPatron(patron: string): Promise<string[]> {
  const claves: string[] = [];
  let cursor = '0';

  do {
    const [siguienteCursor, resultados] = await redis.scan(cursor, 'MATCH', patron, 'COUNT', 100);
    cursor = siguienteCursor;
    claves.push(...resultados);
  } while (cursor !== '0');

  return claves;
}