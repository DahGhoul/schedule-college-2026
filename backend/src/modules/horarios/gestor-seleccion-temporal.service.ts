import { redis } from '@/lib/redis';
import { SeleccionTemporal } from './horarios.types';
import { obtenerClavesPorPatron } from './redis-claves';

const TTL_SEGUNDOS = 600; // 10 minutos de expiración para selecciones temporales

export class GestorSeleccionTemporal {
  static generarClave(idAmbiente: number, diaSemana: string, horaInicio: string, idDocente?: number): string {
    if (!idAmbiente || idAmbiente === 0) {
      return `seleccion_temporal:request:${idDocente}:${diaSemana}:${horaInicio}`;
    }
    return `seleccion_temporal:${idAmbiente}:${diaSemana}:${horaInicio}`;
  }

  static async seleccionarCelda(seleccion: SeleccionTemporal): Promise<void> {
    const clave = this.generarClave(seleccion.idAmbiente || 0, seleccion.diaSemana, seleccion.horaInicio, seleccion.idDocente);

    // Intentar establecer la selección de forma atómica usando SET NX.
    // Si la clave no existe, SET con NX devolverá 'OK' y la reserva se realiza.
    const valor = JSON.stringify(seleccion);
    const resultado = await (redis as any).set(clave, valor, 'EX', TTL_SEGUNDOS, 'NX');

    if (resultado === 'OK') return;

    // Si no se pudo establecer con NX, leer el valor existente y permitir
    // la renovación del TTL si la selección pertenece al mismo docente.
    const existente = await redis.get(clave);
    if (existente) {
      const data = JSON.parse(existente);
      if (data.idDocente === seleccion.idDocente) {
        // Renovar TTL y actualizar contenido usando SET XX
        await (redis as any).set(clave, valor, 'EX', TTL_SEGUNDOS, 'XX');
        return;
      }
      throw new Error('La celda ya está seleccionada por otro docente');
    }

    // En caso raro de condición de carrera, intentar de nuevo una vez
    const intento = await (redis as any).set(clave, valor, 'EX', TTL_SEGUNDOS, 'NX');
    if (intento === 'OK') return;
    throw new Error('No se pudo seleccionar la celda temporalmente');
  }

  static async deseleccionarCelda(
    idAmbiente: number,
    diaSemana: string,
    horaInicio: string,
    idDocente?: number
  ): Promise<void> {
    const clave = this.generarClave(idAmbiente, diaSemana, horaInicio, idDocente);
    await redis.del(clave);
  }

  static async obtenerSeleccionesDocente(idDocente: number): Promise<SeleccionTemporal[]> {
    const claves = await obtenerClavesPorPatron('seleccion_temporal:*');
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

  static async obtenerTodasLasSelecciones(): Promise<SeleccionTemporal[]> {
    const claves = await obtenerClavesPorPatron('seleccion_temporal:*');
    const selecciones: SeleccionTemporal[] = [];
    for (const clave of claves) {
      const valor = await redis.get(clave);
      if (valor) {
        const seleccion = JSON.parse(valor) as SeleccionTemporal;
        selecciones.push(seleccion);
      }
    }
    return selecciones;
  }

  static async limpiarSeleccionesExpiradas(): Promise<void> {
    // Redis elimina automáticamente al expirar TTL, pero podemos forzar limpieza
    const claves = await obtenerClavesPorPatron('seleccion_temporal:*');
    for (const clave of claves) {
      const ttl = await redis.ttl(clave);
      if (ttl <= 0) await redis.del(clave);
    }
  }
}