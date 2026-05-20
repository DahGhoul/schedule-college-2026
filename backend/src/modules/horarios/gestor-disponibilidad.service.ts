import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { MatrizDisponibilidad, DisponibilidadCelda, SeleccionTemporal } from './horarios.types';
import { obtenerClavesPorPatron } from './redis-claves';

export class GestorDisponibilidad {
  /**
   * Construye la matriz de disponibilidad para un ambiente en un período
   */
  static async construirMatriz(
    idAmbiente: number,
    idPeriodo: number
  ): Promise<MatrizDisponibilidad> {
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    if (!ambiente) throw new Error('Ambiente no encontrado');

    // Obtener restricciones
    const configs = await prisma.configuracion.findMany({
      where: { id_periodo: idPeriodo },
    });
    const mapaConfig: Record<string, string> = {};
    configs.forEach((c) => (mapaConfig[c.clave] = c.valor));

    const franjaInicio = mapaConfig['FRANJA_INICIO'] || '07:00';
    const franjaFin = mapaConfig['FRANJA_FIN'] || '22:00';
    const almuerzoInicio = mapaConfig['BLOQUEO_ALMUERZO_INICIO'] || '12:00';
    const almuerzoFin = mapaConfig['BLOQUEO_ALMUERZO_FIN'] || '13:00';

    // Obtener horarios ya asignados (CONFIRMADO/PUBLICADO)
    const horariosAsignados = await prisma.bloque_horario.findMany({
      where: {
        id_ambiente: idAmbiente,
        id_periodo: idPeriodo,
        estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
      },
      select: { dia_semana: true, hora_inicio: true, hora_fin: true },
    });

    // Obtener selecciones temporales desde Redis
    const clavesTemporales = await obtenerClavesPorPatron(`seleccion_temporal:${idAmbiente}:*`);
    const seleccionesTemporales : SeleccionTemporal[] = [];
    for (const clave of clavesTemporales) {
      const valor = await redis.get(clave);
      if (valor) seleccionesTemporales.push(JSON.parse(valor));
    }

    // Obtener mantenimientos activos
    const mantenimientos = await prisma.mantenimiento.findMany({
      where: {
        id_ambiente: idAmbiente,
        fecha_inicio: { lte: new Date() },
        fecha_fin: { gte: new Date() },
      },
    });

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = this.generarFranjasHorarias(franjaInicio, franjaFin);

    const filas = horas.map((hora) => {
      const celdas: DisponibilidadCelda[] = dias.map((dia) => {
        // Bloqueo institucional de almuerzo
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          return { diaSemana: dia, horaInicio: hora, estado: 'BLOQUEO_INSTITUCIONAL' };
        }
        // Mantenimiento
        if (mantenimientos.length > 0) {
          return { diaSemana: dia, horaInicio: hora, estado: 'OCUPADO' };
        }
        // Horario confirmado
        const ocupado = horariosAsignados.some(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (ocupado) return { diaSemana: dia, horaInicio: hora, estado: 'OCUPADO' };
        // Selección temporal
        const temporal = seleccionesTemporales.some(
          (s) => s.diaSemana === dia && s.horaInicio === hora
        );
        if (temporal) return { diaSemana: dia, horaInicio: hora, estado: 'SELECCION_TEMPORAL' };
        return { diaSemana: dia, horaInicio: hora, estado: 'LIBRE' };
      });
      return { horaInicio: hora, celdas };
    });

    return {
      ambienteId: idAmbiente,
      ambienteCodigo: ambiente.codigo,
      filas,
    };
  }

  /**
   * Genera las franjas horarias desde inicio hasta fin (cada 1 hora)
   */
  static generarFranjasHorarias(inicio: string, fin: string): string[] {
    const franjas: string[] = [];
    let [horaInicio] = inicio.split(':').map(Number);
    const [horaFin] = fin.split(':').map(Number);
    while (horaInicio < horaFin) {
      const hh = horaInicio.toString().padStart(2, '0');
      franjas.push(`${hh}:00`);
      horaInicio++;
    }
    return franjas;
  }
}
