import { prisma } from '@/lib/prisma';

type Restricciones = {
  franjaInicio: string;
  franjaFin: string;
  horasMaximasDiarias: number;
  bloqueoAlmuerzoInicio: string;
  bloqueoAlmuerzoFin: string;
};

type OpcionGeneracion = {
  idPeriodo: number;
  idCiclo?: number | null;
  modoPrueba?: boolean;
};

type DisponibilidadSlot = {
  id_docente?: number;
  id_ambiente?: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
};

type BloqueGenerado = {
  id_periodo: number;
  id_docente: number;
  id_componente: number;
  id_grupo: number;
  id_ambiente: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'BORRADOR';
  pendiente_ambiente: boolean;
};

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;

export class GeneradorHorariosService {
  static async generar(opciones: OpcionGeneracion) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: opciones.idPeriodo } });
    if (!periodo) throw new Error('Período no encontrado');

    const restricciones = await this.obtenerRestricciones(opciones.idPeriodo);
    const horasDisponibles = this.generarHoras(restricciones.franjaInicio, restricciones.franjaFin).filter(
      (hora) => !this.estaEnBloqueoAlmuerzo(hora, restricciones)
    );

    const ofertas = await prisma.curso_oferta.findMany({
      where: { id_periodo: opciones.idPeriodo, ...(opciones.idCiclo ? { id_ciclo: opciones.idCiclo } : {}) },
      include: {
        curso: true,
        componentes: {
          include: {
            grupos: { where: { activo: true }, orderBy: { codigo: 'asc' } },
            asignaciones: { orderBy: { id: 'asc' } },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [{ id_ciclo: 'asc' }, { id_curso: 'asc' }],
    });

    const docentes = await prisma.docente.findMany({
      where: { activo: true },
      include: { disponibilidad: true },
    });

    const ambientes = await prisma.ambiente.findMany({ where: { activo: true } });
    const disponibilidadAmbiente = await prisma.disponibilidad_ambiente.findMany({ where: { disponible: true } });

    const disponibilidadDocenteMapa = this.crearMapaDisponibilidad(
      docentes.flatMap((docente) =>
        docente.disponibilidad.map((slot) => ({
          id_docente: docente.id,
          dia_semana: slot.dia_semana,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          disponible: slot.disponible,
        }))
      )
    );

    const disponibilidadAmbienteMapa = this.crearMapaDisponibilidad(
      disponibilidadAmbiente.map((slot) => ({
        id_ambiente: slot.id_ambiente,
        dia_semana: slot.dia_semana,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        disponible: slot.disponible,
      }))
    );

    const existentes = await prisma.bloque_horario.findMany({
      where: { id_periodo: opciones.idPeriodo, estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } },
      select: { id_docente: true, id_ambiente: true, dia_semana: true, hora_inicio: true },
    });

    const ocupacionDocente = new Set<string>(existentes.map((b) => `${b.id_docente}|${b.dia_semana}|${b.hora_inicio}`));
    const ocupacionAmbiente = new Set<string>(existentes.map((b) => `${b.id_ambiente}|${b.dia_semana}|${b.hora_inicio}`));

    const bloquesGenerados: BloqueGenerado[] = [];
    const noAsignados: Array<{ curso: string; componente: string; grupo?: string; horas: number; motivo?: string }> = [];
    const modoPrueba = !!opciones.modoPrueba;

    for (const oferta of ofertas) {
      for (const componente of oferta.componentes) {
        if (componente.horas_requeridas <= 0) continue;

        let grupos = componente.grupos;
        if (grupos.length === 0) {
          const creado = await prisma.grupo.create({
            data: {
              id_componente: componente.id,
              codigo: 'UNICO',
              capacidad_maxima: 40,
              activo: true,
            },
          });
          grupos = [creado];
        }

        if (componente.asignaciones.length === 0) {
          noAsignados.push({
            curso: oferta.curso.nombre,
            componente: componente.tipo,
            horas: componente.horas_requeridas,
            motivo: 'Sin docentes asignados',
          });
          continue;
        }

        const cuposDocentes = componente.asignaciones
          .flatMap((a) => Array.from({ length: Math.max(0, a.horas_asignadas) }, () => a.id_docente))
          .slice();

        const nGrupos = grupos.length || 1;
        const horasPorGrupo = componente.horas_requeridas / nGrupos;

        for (const grupo of grupos) {
          for (let i = 0; i < horasPorGrupo; i++) {
            const docenteId = cuposDocentes.shift();
            if (!docenteId) {
              noAsignados.push({
                curso: oferta.curso.nombre,
                componente: componente.tipo,
                grupo: grupo.codigo,
                horas: horasPorGrupo - i,
                motivo: 'Horas docentes insuficientes',
              });
              break;
            }

            const ambientesCompatibles = this.obtenerAmbientesCompatibles(
              ambientes,
              componente.tipo,
              grupo.capacidad_maxima,
              modoPrueba
            );

            const slot = this.encontrarPrimerSlotDisponible({
              docenteId,
              ambientes: ambientesCompatibles,
              horasDisponibles,
              disponibilidadDocenteMapa,
              disponibilidadAmbienteMapa,
              ocupacionDocente,
              ocupacionAmbiente,
            });

            if (!slot) {
              noAsignados.push({
                curso: oferta.curso.nombre,
                componente: componente.tipo,
                grupo: grupo.codigo,
                horas: componente.horas_requeridas - i,
                motivo: 'Sin slots disponibles',
              });
              break;
            }

            bloquesGenerados.push({
              id_periodo: opciones.idPeriodo,
              id_docente: docenteId,
              id_componente: componente.id,
              id_grupo: grupo.id,
              id_ambiente: slot.idAmbiente,
              dia_semana: slot.dia,
              hora_inicio: slot.hora,
              hora_fin: this.sumarUnaHora(slot.hora),
              estado: 'BORRADOR',
              pendiente_ambiente: false,
            });

            ocupacionDocente.add(`${docenteId}|${slot.dia}|${slot.hora}`);
            ocupacionAmbiente.add(`${slot.idAmbiente}|${slot.dia}|${slot.hora}`);
          }
        }
      }
    }

    if (bloquesGenerados.length > 0) {
      await prisma.bloque_horario.createMany({ data: bloquesGenerados });
    }

    return {
      periodo: periodo.nombre,
      creados: bloquesGenerados.length,
      noAsignados,
      modoPrueba,
    };
  }

  private static obtenerAmbientesCompatibles(
    ambientes: Array<{ id: number; tipo: string; capacidad: number }>,
    tipoComponente: string,
    capacidadGrupo: number,
    modoPrueba: boolean
  ) {
    return ambientes.filter((a) => {
      if (!modoPrueba && capacidadGrupo > a.capacidad) return false;
      if (tipoComponente === 'LABORATORIO') return a.tipo === 'LABORATORIO';
      if (tipoComponente === 'PRACTICA') return a.tipo === 'AULA' || a.tipo === 'LABORATORIO';
      return a.tipo === 'AULA';
    });
  }

  private static encontrarPrimerSlotDisponible(params: {
    docenteId: number;
    ambientes: Array<{ id: number }>;
    horasDisponibles: string[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocente: Set<string>;
    ocupacionAmbiente: Set<string>;
  }) {
    for (const dia of DIAS) {
      for (const hora of params.horasDisponibles) {
        if (!this.slotDisponibleDocente(params.docenteId, dia, hora, params.disponibilidadDocenteMapa, params.ocupacionDocente)) continue;
        for (const ambiente of params.ambientes) {
          if (!this.slotDisponibleAmbiente(ambiente.id, dia, hora, params.disponibilidadAmbienteMapa, params.ocupacionAmbiente)) continue;
          return { dia, hora, idAmbiente: ambiente.id };
        }
      }
    }
    return null;
  }

  private static crearMapaDisponibilidad(items: DisponibilidadSlot[]) {
    const mapa = new Map<string, boolean>();
    for (const item of items) {
      const id = item.id_docente ?? item.id_ambiente;
      if (id == null) continue;
      mapa.set(`${id}|${item.dia_semana}|${item.hora_inicio}`, item.disponible);
    }
    return mapa;
  }

  private static slotDisponibleDocente(idDocente: number, dia: string, hora: string, disponibilidad: Map<string, boolean>, ocupacion: Set<string>) {
    const clave = `${idDocente}|${dia}|${hora}`;
    const disponibleDeclarado = disponibilidad.size === 0 ? true : disponibilidad.get(`${idDocente}|${dia}|${hora}`) ?? false;
    return disponibleDeclarado && !ocupacion.has(clave);
  }

  private static slotDisponibleAmbiente(idAmbiente: number, dia: string, hora: string, disponibilidad: Map<string, boolean>, ocupacion: Set<string>) {
    const clave = `${idAmbiente}|${dia}|${hora}`;
    const disponibleDeclarado = disponibilidad.size === 0 ? true : disponibilidad.get(`${idAmbiente}|${dia}|${hora}`) ?? false;
    return disponibleDeclarado && !ocupacion.has(clave);
  }

  private static async obtenerRestricciones(idPeriodo: number): Promise<Restricciones> {
    const configs = await prisma.configuracion.findMany({ where: { id_periodo: idPeriodo } });
    const mapa: Record<string, string> = {};
    for (const c of configs) mapa[c.clave] = c.valor;
    return {
      franjaInicio: mapa.FRANJA_INICIO || '07:00',
      franjaFin: mapa.FRANJA_FIN || '22:00',
      horasMaximasDiarias: parseInt(mapa.HORAS_MAX_DIARIAS || '8', 10),
      bloqueoAlmuerzoInicio: mapa.BLOQUEO_ALMUERZO_INICIO || '13:00',
      bloqueoAlmuerzoFin: mapa.BLOQUEO_ALMUERZO_FIN || '15:00',
    };
  }

  private static generarHoras(inicio: string, fin: string): string[] {
    const [horaInicio] = inicio.split(':').map(Number);
    const [horaFin] = fin.split(':').map(Number);
    const horas: string[] = [];
    for (let hora = horaInicio; hora < horaFin; hora++) {
      horas.push(`${String(hora).padStart(2, '0')}:00`);
    }
    return horas;
  }

  private static estaEnBloqueoAlmuerzo(hora: string, restricciones: Restricciones) {
    return hora >= restricciones.bloqueoAlmuerzoInicio && hora < restricciones.bloqueoAlmuerzoFin;
  }

  private static sumarUnaHora(hora: string) {
    const valor = parseInt(hora.slice(0, 2), 10) + 1;
    return `${String(valor).padStart(2, '0')}:00`;
  }
}
