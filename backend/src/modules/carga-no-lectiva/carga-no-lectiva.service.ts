import { prisma } from '@/lib/prisma';

type DatosDocenteActualizables = {
  codigo_ibm?: string;
  modalidad?: string;
  categoria?: string;
  dedicacion?: string;
  telefono?: string | null;
};

type SeccionNoLectivaPayload = {
  seccion: string;
  horas?: number;
  codigo_resolucion?: string | null;
  descripcion?: string | null;
};

type GuardarCargaNoLectivaPayload = {
  docente?: DatosDocenteActualizables;
  secciones?: SeccionNoLectivaPayload[];
};

const prismaDb = prisma as any;
const ESTADO_BORRADOR = 'BORRADOR';

const normalizarNumero = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

export class CargaNoLectivaService {
  static async obtenerMiDeclaracion(idDocente: number, idPeriodo: number) {
    const [docente, declaracion] = await Promise.all([
      prismaDb.docente.findUnique({
        where: { id: idDocente },
      }),
      prismaDb.declaracion_carga.findFirst({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
        include: {
          secciones: {
            orderBy: { seccion: 'asc' },
          },
        },
      }),
    ]);

    return {
      docente,
      declaracion,
    };
  }

  static async guardarMiDeclaracion(
    idDocente: number,
    idPeriodo: number,
    payload: GuardarCargaNoLectivaPayload
  ) {
    const secciones = Array.isArray(payload.secciones) ? payload.secciones : [];

    return prisma.$transaction(async (tx) => {
      const docenteData: Record<string, unknown> = {};
      if (payload.docente?.codigo_ibm !== undefined) docenteData.codigo_ibm = String(payload.docente.codigo_ibm ?? '');
      if (payload.docente?.modalidad !== undefined) docenteData.modalidad = String(payload.docente.modalidad ?? '');
      if (payload.docente?.categoria !== undefined) docenteData.categoria = String(payload.docente.categoria ?? '');
      if (payload.docente?.dedicacion !== undefined) docenteData.dedicacion = payload.docente.dedicacion;
      if (payload.docente?.telefono !== undefined) docenteData.telefono = payload.docente.telefono;

      if (Object.keys(docenteData).length > 0) {
        await (tx as any).docente.update({
          where: { id: idDocente },
          data: docenteData,
        });
      }

      const totalHorasNoLectivas = secciones.reduce((acumulado, seccion) => acumulado + normalizarNumero(seccion.horas), 0);

      let declaracion = await (tx as any).declaracion_carga.findFirst({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
      });

      if (!declaracion) {
        declaracion = await (tx as any).declaracion_carga.create({
          data: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
            total_horas_lectivas: 0,
            total_horas_no_lectivas: totalHorasNoLectivas,
            total_horas: totalHorasNoLectivas,
            estado: ESTADO_BORRADOR,
          },
        });
      } else {
        declaracion = await (tx as any).declaracion_carga.update({
          where: { id: declaracion.id },
          data: {
            total_horas_no_lectivas: totalHorasNoLectivas,
            total_horas: totalHorasNoLectivas,
            fecha_declaracion: new Date(),
            estado: ESTADO_BORRADOR,
          },
        });
      }

      await (tx as any).carga_no_lectiva.deleteMany({
        where: { id_declaracion: declaracion.id },
      });

      if (secciones.length > 0) {
        await (tx as any).carga_no_lectiva.createMany({
          data: secciones.map((seccion) => ({
            id_declaracion: declaracion.id,
            id_docente: idDocente,
            id_periodo: idPeriodo,
            seccion: seccion.seccion,
            descripcion: seccion.descripcion ?? null,
            horas_declaradas: normalizarNumero(seccion.horas),
            codigo_resolucion: seccion.codigo_resolucion ?? null,
            valido: true,
            observacion: null,
            fecha_modificacion: new Date(),
          })),
        });
      }

      return this.obtenerMiDeclaracion(idDocente, idPeriodo);
    });
  }

  static async eliminarMiDeclaracion(idDocente: number, idPeriodo: number) {
    await prismaDb.declaracion_carga.deleteMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
    });

    return { mensaje: 'Declaración no lectiva eliminada' };
  }
}