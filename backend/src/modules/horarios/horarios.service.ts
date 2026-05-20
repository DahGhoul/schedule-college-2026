import { prisma } from '@/lib/prisma';
import { GestorDisponibilidad } from './gestor-disponibilidad.service';
import { GestorSeleccionTemporal } from './gestor-seleccion-temporal.service';
import { ValidadorHorario } from './validador-horario.service';
import { redis } from '@/lib/redis';

export class HorariosService {
  /**
   * Obtener la matriz de disponibilidad para un ambiente
   */
  static async obtenerMatrizDisponibilidad(idAmbiente: number, idPeriodo: number) {
    return GestorDisponibilidad.construirMatriz(idAmbiente, idPeriodo);
  }

  /**
   * Obtener bloques horarios pendientes de asignación de ambiente
   */
  static async obtenerPendientesAmbiente() {
    return prisma.bloque_horario.findMany({
      where: {
        pendiente_ambiente: true,
        estado: { in: ['BORRADOR', 'CONFIRMADO'] },
      },
      include: {
        docente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        grupo: true,
      },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  /**
   * Seleccionar una celda (guardado temporal en Redis)
   */
  static async seleccionarCelda(datos: {
    idDocente: number;
    idComponente: number;
    idGrupo: number;
    idAmbiente?: number;
    modoPrueba?: boolean;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    sesionId: string;
  }) {
    await this.validarDatosSeleccion(datos);

    await GestorSeleccionTemporal.seleccionarCelda(datos as any);

    // Publicar evento para notificar a otros clientes
    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'celda_seleccionada', idAmbiente: datos.idAmbiente || 0 })
    );

    return { mensaje: 'Celda seleccionada temporalmente' };
  }

  private static async validarDatosSeleccion(datos: {
    idDocente: number;
    idComponente: number;
    idGrupo: number;
    idAmbiente?: number;
    modoPrueba?: boolean;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
  }) {
    const [docente, componente, ambiente, grupo] = await Promise.all([
      prisma.docente.findUnique({ where: { id: datos.idDocente } }),
      prisma.curso_componente.findUnique({
        where: { id: datos.idComponente },
        include: { oferta: true },
      }),
      datos.idAmbiente ? prisma.ambiente.findUnique({ where: { id: datos.idAmbiente } }) : Promise.resolve(null),
      prisma.grupo.findUnique({ where: { id: datos.idGrupo } }),
    ]);

    if (!docente || !docente.activo) throw new Error('Docente inválido o inactivo');
    if (!componente) throw new Error('Componente inválido');
    if (datos.idAmbiente && (!ambiente || !ambiente.activo)) throw new Error('Ambiente inválido o inactivo');
    if (!grupo || !grupo.activo) throw new Error('Grupo inválido o inactivo');
    if (grupo.id_componente !== datos.idComponente) throw new Error('El grupo no corresponde al componente seleccionado');

    const asignacion = await prisma.asignacion_docente_componente.findFirst({
      where: {
        id_docente: datos.idDocente,
        id_componente: datos.idComponente,
      },
    });
    if (!asignacion) {
      throw new Error('El docente no tiene asignado este componente');
    }

    const seleccionesTemporalesDocente = await GestorSeleccionTemporal.obtenerSeleccionesDocente(datos.idDocente);
    const tieneCruceTemporal = seleccionesTemporalesDocente.some(
      (sel) => sel.diaSemana === datos.diaSemana && sel.horaInicio === datos.horaInicio
    );
    if (tieneCruceTemporal) {
      throw new Error('El docente ya tiene una selección temporal en ese bloque horario');
    }

    if (datos.idAmbiente && ambiente) {
      const tipoRequerido = componente.tipo === 'LABORATORIO' ? 'LABORATORIO' : 'AULA';
      if (componente.tipo === 'PRACTICA' && ambiente.tipo === 'LABORATORIO') {
        // permitido
      } else if (ambiente.tipo !== tipoRequerido) {
        throw new Error('El componente no es compatible con el tipo de ambiente seleccionado');
      }

      if (!datos.modoPrueba && grupo.capacidad_maxima > ambiente.capacidad) {
        throw new Error(`Aforo insuficiente: grupo ${grupo.capacidad_maxima} > ambiente ${ambiente.capacidad}`);
      }

      const conflictoAmbiente = await prisma.bloque_horario.findFirst({
        where: {
          id_periodo: componente.oferta.id_periodo,
          id_ambiente: datos.idAmbiente,
          dia_semana: datos.diaSemana,
          hora_inicio: datos.horaInicio,
          estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
        },
      });
      if (conflictoAmbiente) {
        throw new Error('El ambiente ya está ocupado en ese bloque horario');
      }
    }

    const conflictoDocente = await prisma.bloque_horario.findFirst({
      where: {
        id_periodo: componente.oferta.id_periodo,
        id_docente: datos.idDocente,
        dia_semana: datos.diaSemana,
        hora_inicio: datos.horaInicio,
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
      },
    });
    if (conflictoDocente) {
      throw new Error('El docente ya tiene una clase en ese bloque horario');
    }
  }

  /**
   * Deseleccionar una celda
   */
  static async deseleccionarCelda(datos: {
    idAmbiente?: number;
    diaSemana: string;
    horaInicio: string;
    idDocente: number;
  }) {
    await GestorSeleccionTemporal.deseleccionarCelda(
      datos.idAmbiente || 0,
      datos.diaSemana,
      datos.horaInicio,
      datos.idDocente
    );

    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'celda_deseleccionada', idAmbiente: datos.idAmbiente || 0 })
    );

    return { mensaje: 'Celda liberada' };
  }

  /**
   * Obtener todas las selecciones temporales de un docente
   */
  static async obtenerSeleccionesTemporales(idDocente: number) {
    const selecciones = await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente);

    // Enriquecer con nombres
    const enriquecidas = await Promise.all(
      selecciones.map(async (sel) => {
        const componente = await prisma.curso_componente.findUnique({
          where: { id: sel.idComponente },
          include: { oferta: { include: { curso: true } } },
        });
        const ambiente = await prisma.ambiente.findUnique({ where: { id: sel.idAmbiente } });
        const grupo = await prisma.grupo.findUnique({ where: { id: sel.idGrupo } });
        return {
          ...sel,
          nombreCurso: componente?.oferta?.curso?.nombre || '',
          tipoComponente: componente?.tipo || '',
          codigoGrupo: grupo?.codigo || '',
          codigoAmbiente: ambiente?.codigo || '',
        };
      })
    );

    return enriquecidas;
  }

  /**
   * Validar la selección actual de un docente
   */
  static async validarSeleccion(idDocente: number, idPeriodo: number) {
    return ValidadorHorario.validarSeleccionCompleta(idDocente, idPeriodo);
  }

  /**
   * Calcular progreso de horas por curso para un docente
   */
  static async obtenerProgreso(idDocente: number) {
    const asignaciones = await prisma.asignacion_docente_componente.findMany({
      where: { id_docente: idDocente },
      include: { componente: { include: { oferta: { include: { curso: true } } } } },
    });

    const selecciones = await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente);

    return asignaciones.map((a) => {
      const horasAsignadas = selecciones.filter((s) => s.idComponente === a.id_componente).length;
      return {
        idComponente: a.id_componente,
        nombreCurso: a.componente.oferta.curso.nombre,
        tipoComponente: a.componente.tipo,
        horasRequeridas: a.horas_asignadas,
        horasAsignadas,
      };
    });
  }
}
