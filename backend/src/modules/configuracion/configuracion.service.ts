import { prisma } from '@/lib/prisma';
import { RestriccionInstitucional } from './configuracion.types';

export class ConfiguracionService {
  /**
   * Obtiene las restricciones activas del período activo
   */
  static async obtenerRestricciones(): Promise<RestriccionInstitucional> {
    const periodo = await prisma.periodo_academico.findFirst({
      where: { activo: true },
    });
    if (!periodo) throw new Error('No hay período activo');

    const configs = await prisma.configuracion.findMany({
      where: { id_periodo: periodo.id },
    });

    const mapa: Record<string, string> = {};
    configs.forEach((c) => (mapa[c.clave] = c.valor));

    return {
      franjaInicio: mapa['FRANJA_INICIO'] || '07:00',
      franjaFin: mapa['FRANJA_FIN'] || '22:00',
      horasMaximasDiarias: parseInt(mapa['HORAS_MAX_DIARIAS'] || '8'),
      bloqueoAlmuerzoInicio: mapa['BLOQUEO_ALMUERZO_INICIO'] || '12:00',
      bloqueoAlmuerzoFin: mapa['BLOQUEO_ALMUERZO_FIN'] || '13:00',
      tiempoAtencionVentana: parseInt(mapa['TIEMPO_ATENCION_VENTANA'] || '30'),
      limiteMinPreparacionPct: parseFloat(mapa['LIMITE_MIN_PREPARACION_PCT'] || '0.5'),
      limiteMaxAsesoriaTesis: parseInt(mapa['LIMITE_MAX_ASESORIA_TESIS'] || '2'),
      limiteMaxCapacitacion: parseInt(mapa['LIMITE_MAX_CAPACITACION'] || '1'),
      limiteMaxInvestigacion: parseInt(mapa['LIMITE_MAX_INVESTIGACION'] || '6'),
    };
  }

  /**
   * Actualiza las restricciones (crea o actualiza las claves)
   */
  static async actualizarRestricciones(datos: Record<string, string | number>): Promise<void> {
    const periodo = await prisma.periodo_academico.findFirst({
      where: { activo: true },
    });
    if (!periodo) throw new Error('No hay período activo');

    for (const [clave, valor] of Object.entries(datos)) {
      await prisma.configuracion.upsert({
        where: {
          id_periodo_clave: {
            id_periodo: periodo.id,
            clave,
          },
        },

        update: {
          valor: String(valor),
        },

        create: {
          id_periodo: periodo.id,
          clave,
          valor: String(valor),
          tipo:
            typeof valor === 'number'
              ? 'NUMERO'
              : 'TEXTO',
        },
      });
    }
  }

  // ─── Días no laborables ───

  static async listarDiasNoLaborables(anio?: number) {
    const where: any = {};
    if (anio) {
      where.fecha = {
        gte: new Date(`${anio}-01-01`),
        lte: new Date(`${anio}-12-31`),
      };
    }
    return prisma.dia_no_laborable.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });
  }

  static async crearDiaNoLaborable(datos: { fecha: string; descripcion: string; tipo: string }) {
    return prisma.dia_no_laborable.create({
      data: {
        fecha: new Date(datos.fecha),
        descripcion: datos.descripcion,
        tipo: datos.tipo,
      },
    });
  }

  static async actualizarDiaNoLaborable(id: number, datos: any) {
    return prisma.dia_no_laborable.update({
      where: { id },
      data: {
        ...datos,
        ...(datos.fecha && { fecha: new Date(datos.fecha) }),
      },
    });
  }

  static async eliminarDiaNoLaborable(id: number) {
    return prisma.dia_no_laborable.delete({ where: { id } });
  }
}