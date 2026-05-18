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
   * Seleccionar una celda (guardado temporal en Redis)
   */
  static async seleccionarCelda(datos: {
    idDocente: number;
    idCurso: number;
    idGrupo?: number;
    idAmbiente: number;
    modoPrueba?: boolean;
    tipoClase: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    sesionId: string;
  }) {
    await this.validarDatosSeleccion(datos);

    await GestorSeleccionTemporal.seleccionarCelda(datos);

    // Publicar evento para notificar a otros clientes
    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'celda_seleccionada', idAmbiente: datos.idAmbiente })
    );

    return { mensaje: 'Celda seleccionada temporalmente' };
  }

  private static async validarDatosSeleccion(datos: {
    idDocente: number;
    idCurso: number;
    idGrupo?: number;
    idAmbiente: number;
    modoPrueba?: boolean;
    tipoClase: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
  }) {
    const [docente, curso, ambiente] = await Promise.all([
      prisma.docente.findUnique({ where: { id: datos.idDocente } }),
      prisma.curso.findUnique({ where: { id: datos.idCurso } }),
      prisma.ambiente.findUnique({ where: { id: datos.idAmbiente } }),
    ]);

    if (!docente || !docente.activo) throw new Error('Docente inválido o inactivo');
    if (!curso) throw new Error('Curso inválido');
    if (!ambiente || !ambiente.activo) throw new Error('Ambiente inválido o inactivo');

    const docenteCurso = await prisma.docente_curso.findFirst({
      where: {
        id_docente: datos.idDocente,
        id_curso: datos.idCurso,
      },
    });
    if (!docenteCurso) {
      throw new Error('El docente no tiene asignado este curso');
    }

    const compatibilidadAmbiente = await prisma.curso_ambiente.findFirst({
      where: {
        id_curso: datos.idCurso,
        id_ambiente: datos.idAmbiente,
        tipo_clase: datos.tipoClase,
      },
    });
    if (!compatibilidadAmbiente) {
      throw new Error('El curso no es compatible con el ambiente/tipo de clase seleccionado');
    }

    if (datos.idGrupo) {
      const grupo = await prisma.grupo.findUnique({ where: { id: datos.idGrupo } });
      if (!grupo || !grupo.activo) throw new Error('Grupo inválido o inactivo');
      if (grupo.id_curso !== datos.idCurso) {
        throw new Error('El grupo no corresponde al curso seleccionado');
      }

      if (!datos.modoPrueba && grupo.capacidad_maxima > ambiente.capacidad) {
        throw new Error(
          `Aforo insuficiente: grupo ${grupo.capacidad_maxima} > ambiente ${ambiente.capacidad}`
        );
      }
    }

    const conflictoAmbiente = await prisma.horario_asignado.findFirst({
      where: {
        id_ambiente: datos.idAmbiente,
        dia_semana: datos.diaSemana,
        hora_inicio: datos.horaInicio,
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
      },
    });
    if (conflictoAmbiente) {
      throw new Error('El ambiente ya está ocupado en ese bloque horario');
    }

    const conflictoDocente = await prisma.horario_asignado.findFirst({
      where: {
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
    idAmbiente: number;
    diaSemana: string;
    horaInicio: string;
  }) {
    await GestorSeleccionTemporal.deseleccionarCelda(
      datos.idAmbiente,
      datos.diaSemana,
      datos.horaInicio
    );

    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'celda_deseleccionada', idAmbiente: datos.idAmbiente })
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
        const curso = await prisma.curso.findUnique({ where: { id: sel.idCurso } });
        const ambiente = await prisma.ambiente.findUnique({ where: { id: sel.idAmbiente } });
        return {
          ...sel,
          nombreCurso: curso?.nombre || '',
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
    const docenteCursos = await prisma.docente_curso.findMany({
      where: { id_docente: idDocente },
      include: { curso: true },
    });

    const selecciones = await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente);

    return docenteCursos.flatMap((dc) => {
      const progreso = [];
      if (dc.curso.horas_teoria > 0) {
        const asignadas = selecciones.filter(
          (s) => s.idCurso === dc.id_curso && s.tipoClase === 'TEORIA'
        ).length;
        progreso.push({
          idCurso: dc.curso.id,
          nombreCurso: dc.curso.nombre,
          tipoClase: 'TEORIA',
          horasRequeridas: dc.curso.horas_teoria,
          horasAsignadas: asignadas,
        });
      }
      if (dc.curso.horas_laboratorio > 0) {
        const asignadas = selecciones.filter(
          (s) => s.idCurso === dc.id_curso && s.tipoClase === 'LABORATORIO'
        ).length;
        progreso.push({
          idCurso: dc.curso.id,
          nombreCurso: dc.curso.nombre,
          tipoClase: 'LABORATORIO',
          horasRequeridas: dc.curso.horas_laboratorio,
          horasAsignadas: asignadas,
        });
      }
      return progreso;
    });
  }
}