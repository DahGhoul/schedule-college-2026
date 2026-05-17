import { redis } from '@/lib/redis';
import { SeleccionTemporal } from './horarios.types';

const TTL_SEGUNDOS = 600; // 10 minutos de expiración para selecciones temporales

export class GestorSeleccionTemporal {
  static generarClave(idAmbiente: number, diaSemana: string, horaInicio: string): string {
    return `seleccion_temporal:${idAmbiente}:${diaSemana}:${horaInicio}`;
  }

  static async seleccionarCelda(seleccion: SeleccionTemporal): Promise<void> {
    const clave = this.generarClave(seleccion.idAmbiente, seleccion.diaSemana, seleccion.horaInicio);

    // Verificar si la celda ya está ocupada temporalmente por otro usuario
    const existente = await redis.get(clave);
    if (existente) {
      const data = JSON.parse(existente);
      if (data.idDocente !== seleccion.idDocente) {
        throw new Error('La celda ya está seleccionada por otro docente');
      }
    }

    await redis.setex(clave, TTL_SEGUNDOS, JSON.stringify(seleccion));
  }

  static async deseleccionarCelda(
    idAmbiente: number,
    diaSemana: string,
    horaInicio: string
  ): Promise<void> {
    const clave = this.generarClave(idAmbiente, diaSemana, horaInicio);
    await redis.del(clave);
  }

  static async obtenerSeleccionesDocente(idDocente: number): Promise<SeleccionTemporal[]> {
    const claves = await redis.keys('seleccion_temporal:*');
    const selecciones: SeleccionTemporal[] = [];
    for (const clave of claves) {
      const valor = await redis.get(clave);
      if (valor) {
        const seleccion = JSON.parse(valor) as SeleccionTemporal;
        if (seleccion.idDocente === idDocente) {
          selecciones.push(seleccion);
        }
      }
    }
    return selecciones;
  }

  static async limpiarSeleccionesExpiradas(): Promise<void> {
    // Redis elimina automáticamente al expirar TTL, pero podemos forzar limpieza
    const claves = await redis.keys('seleccion_temporal:*');
    for (const clave of claves) {
      const ttl = await redis.ttl(clave);
      if (ttl <= 0) await redis.del(clave);
    }
  }
}