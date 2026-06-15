import { prisma } from '@/lib/prisma';
import { GestorDisponibilidad } from './gestor-disponibilidad.service';
import { GestorSeleccionTemporal } from './gestor-seleccion-temporal.service';
import { ValidadorHorario } from './validador-horario.service';
import { redis } from '@/lib/redis';

export class HorariosService {
  /**
   * Obtener la matriz de disponibilidad para un ambiente
   */
  static async obtenerMatrizDisponibilidad(idAmbiente: number, idPeriodo: number, idDocente?: number, idComponente?: number) {
    return GestorDisponibilidad.construirMatriz(idAmbiente, idPeriodo, idDocente, idComponente);
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
    const diasValidos = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const diaNormalizado = datos.diaSemana.toUpperCase();
    if (!diasValidos.includes(diaNormalizado)) {
      throw new Error(`Día de la semana no válido: ${datos.diaSemana}`);
    }

    const [docente, componente, ambiente, grupo] = await Promise.all([
      prisma.docente.findUnique({ where: { id: datos.idDocente } }),
      prisma.curso_componente.findUnique({
        where: { id: datos.idComponente },
        include: { oferta: { include: { ciclo: true } }, grupos: true },
      }),
      datos.idAmbiente ? prisma.ambiente.findUnique({ where: { id: datos.idAmbiente } }) : Promise.resolve(null),
      prisma.grupo.findUnique({ where: { id: datos.idGrupo } }),
    ]);

    if (!docente || !docente.activo) throw new Error('Docente inválido o inactivo');
    if (!componente) throw new Error('Componente inválido');
    const idCiclo = componente.oferta.id_ciclo;

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

    // Validar que no exceda las horas asignadas
    const seleccionesTemporales = await this.obtenerSeleccionesTemporales(datos.idDocente);

    // 0.1. Validar que no exceda las horas del grupo específico
    const nGrupos = componente.grupos?.length || 1;
    const horasPorGrupo = componente.horas_requeridas / nGrupos;
    const horasGrupoSeleccionadas = seleccionesTemporales.filter(
      (s) => s.idComponente === datos.idComponente && s.idGrupo === datos.idGrupo
    ).length;
    if (horasGrupoSeleccionadas >= horasPorGrupo) {
      throw new Error(
        `No se pueden seleccionar más horas para el grupo ${grupo.codigo}. Límite del grupo: ${horasPorGrupo}h (Ya seleccionadas: ${horasGrupoSeleccionadas}h).`
      );
    }

    // 0.2. Validar que el docente no exceda la cantidad máxima de grupos asignados
    const maxGrupos = componente.tipo === 'TEORIA' 
      ? (asignacion.horas_asignadas > 0 ? 1 : 0) 
      : Math.round(asignacion.horas_asignadas / horasPorGrupo);
    const gruposConSelecciones = new Set(
      seleccionesTemporales
        .filter((s) => s.idComponente === datos.idComponente)
        .map((s) => s.idGrupo)
    );
    if (!gruposConSelecciones.has(datos.idGrupo) && gruposConSelecciones.size >= maxGrupos) {
      throw new Error(
        `Has alcanzado el límite máximo de grupos asignados para este componente (${maxGrupos} grupo(s)).`
      );
    }

    const horasSeleccionadas = seleccionesTemporales.filter((s) => s.idComponente === datos.idComponente).length;
    if (horasSeleccionadas >= asignacion.horas_asignadas) {
      throw new Error(
        `No se pueden seleccionar más horas para este componente. Límite: ${asignacion.horas_asignadas}h (Ya seleccionadas: ${horasSeleccionadas}h).`
      );
    }

    // 1. Validar cruce del docente
    const seleccionesTemporalesDocente = await GestorSeleccionTemporal.obtenerSeleccionesDocente(datos.idDocente);
    const tieneCruceTemporalDocente = seleccionesTemporalesDocente.some(
      (sel) => sel.diaSemana === datos.diaSemana && sel.horaInicio === datos.horaInicio
    );
    if (tieneCruceTemporalDocente) {
      throw new Error('El docente ya tiene una selección temporal en ese bloque horario');
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

    const conflictosNoLectivos = await prisma.bloque_no_lectivo.findMany({
      where: {
        id_periodo: componente.oferta.id_periodo,
        id_docente: datos.idDocente,
        dia_semana: datos.diaSemana,
      },
    });
    const tieneCruceNoLectivo = conflictosNoLectivos.some(h => h.hora_inicio === datos.horaInicio);
    if (tieneCruceNoLectivo) {
      throw new Error('El docente ya tiene Carga No Lectiva en ese bloque horario');
    }

    // 2. Validar cruce del CICLO (Promoción)
    // 2.1 En la Base de Datos
    const conflictosCiclo = await prisma.bloque_horario.findMany({
      where: {
        id_periodo: componente.oferta.id_periodo,
        dia_semana: datos.diaSemana,
        hora_inicio: datos.horaInicio,
        componente: {
          oferta: {
            id_ciclo: idCiclo,
          },
        },
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
      },
      include: {
        componente: { include: { oferta: { include: { curso: true } } } },
      },
    });

    for (const conflicto of conflictosCiclo) {
      const esLabActual = componente.tipo === 'LABORATORIO';
      const esLabConflicto = conflicto.componente.tipo === 'LABORATORIO';

      // Solo se permite el cruce si AMBOS son LABORATORIO
      if (!(esLabActual && esLabConflicto)) {
        throw new Error(
          `El ciclo ya tiene asignado el curso "${conflicto.componente.oferta.curso.nombre}" (${conflicto.componente.tipo}) en este horario. Solo se permiten cruces entre componentes de LABORATORIO.`
        );
      }
    }

    // 2.2 En selecciones temporales (Redis)
    const todasLasSelecciones = await GestorSeleccionTemporal.obtenerTodasLasSelecciones();
    for (const sel of todasLasSelecciones) {
      if (sel.diaSemana === datos.diaSemana && sel.horaInicio === datos.horaInicio) {
        // Obtenemos el ciclo de esta selección temporal
        const compSel = await prisma.curso_componente.findUnique({
          where: { id: sel.idComponente },
          include: { oferta: true },
        });

        if (compSel?.oferta.id_ciclo === idCiclo && sel.idDocente !== datos.idDocente) {
          const esLabActual = componente.tipo === 'LABORATORIO';
          const esLabTemporal = compSel.tipo === 'LABORATORIO';

          if (!(esLabActual && esLabTemporal)) {
            throw new Error('Este ciclo ya tiene una selección temporal en este horario por otro docente. Solo se permiten cruces entre componentes de LABORATORIO.');
          }
        }
      }
    }

    // 3. Validar cruce del AMBIENTE
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
        include: {
          componente: true
        }
      });

      if (conflictoAmbiente) {
        const esLabActual = componente.tipo === 'LABORATORIO';
        const esLabConflicto = conflictoAmbiente.componente.tipo === 'LABORATORIO';
        const esAmbienteLab = ambiente.tipo === 'LABORATORIO';

        // Si es un ambiente de laboratorio y ambos componentes son LABORATORIO, se permite compartir el ambiente
        if (!(esAmbienteLab && esLabActual && esLabConflicto)) {
          throw new Error('El ambiente ya está ocupado en ese bloque horario');
        }
      }
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
    const clave = GestorSeleccionTemporal.generarClave(
      datos.idAmbiente || 0,
      datos.diaSemana,
      datos.horaInicio,
      datos.idDocente
    );
    const existeEnRedis = await redis.get(clave);

    if (existeEnRedis) {
      await GestorSeleccionTemporal.deseleccionarCelda(
        datos.idAmbiente || 0,
        datos.diaSemana,
        datos.horaInicio,
        datos.idDocente
      );
    } else {
      const bloque = await prisma.bloque_horario.findFirst({
        where: {
          id_docente: datos.idDocente,
          dia_semana: datos.diaSemana,
          hora_inicio: datos.horaInicio,
        },
      });

      if (bloque) {
        if (bloque.estado === 'PUBLICADO') {
          throw new Error('No se puede modificar un horario ya publicado');
        }
        await prisma.bloque_horario.delete({
          where: { id: bloque.id },
        });
      }
    }

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
    const seleccionesRedis = await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente);

    const enriquecidasRedis = await Promise.all(
      seleccionesRedis.map(async (sel) => {
        const componente = await prisma.curso_componente.findUnique({
          where: { id: sel.idComponente },
          include: { oferta: { include: { curso: true } } },
        });
        const ambiente = await prisma.ambiente.findUnique({ where: { id: sel.idAmbiente } });
        const grupo = await prisma.grupo.findUnique({ where: { id: sel.idGrupo } });
        return {
          ...sel,
          confirmado: false,
          publicado: false,
          nombreCurso: componente?.oferta?.curso?.nombre || '',
          tipoComponente: componente?.tipo || '',
          codigoGrupo: grupo?.codigo || '',
          codigoAmbiente: ambiente?.codigo || '',
        };
      })
    );

    const bloquesBD = await prisma.bloque_horario.findMany({
      where: {
        id_docente: idDocente,
      },
      include: {
        componente: { include: { oferta: { include: { curso: true } } } },
        ambiente: true,
        grupo: true,
      },
    });

    const enriquecidosBD = bloquesBD.map((bloque) => ({
      idDocente: bloque.id_docente,
      idComponente: bloque.id_componente,
      idGrupo: bloque.id_grupo,
      idAmbiente: bloque.id_ambiente || undefined,
      diaSemana: bloque.dia_semana,
      horaInicio: bloque.hora_inicio,
      horaFin: bloque.hora_fin,
      sesionId: 'db',
      confirmado: true,
      publicado: bloque.estado === 'PUBLICADO',
      nombreCurso: bloque.componente.oferta.curso.nombre,
      tipoComponente: bloque.componente.tipo,
      codigoGrupo: bloque.grupo.codigo,
      codigoAmbiente: bloque.ambiente?.codigo || '',
    }));

    return [...enriquecidasRedis, ...enriquecidosBD];
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

    const selecciones = await this.obtenerSeleccionesTemporales(idDocente);

    return asignaciones.map((a) =>
    {
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

  /**
   * Exportar horarios de un día específico
   */
  static async exportarHorariosDia(diaSemana: string) {
    return prisma.bloque_horario.findMany({
      where: { dia_semana: diaSemana },
      include: {
        docente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        ambiente: true,
        grupo: true,
      },
      orderBy: [{ hora_inicio: 'asc' }],
    });
  }

  /**
   * Resetear todos los horarios de un periodo
   */
  static async resetearHorarios(idPeriodo: number) {
    // 1. Limpiar selecciones temporales en Redis (opcional pero recomendado)
    // Podríamos iterar sobre todos los docentes o usar un patrón de borrado masivo
    // Por ahora nos enfocamos en la base de datos que es lo definitivo
    
    // 2. Eliminar todos los bloques horarios del periodo
    const resultado = await prisma.bloque_horario.deleteMany({
      where: { id_periodo: idPeriodo }
    });

    // 3. Notificar a través de Redis para refrescar interfaces
    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'reseteo_global', idPeriodo })
    );

    return { 
      mensaje: `Se han eliminado ${resultado.count} bloques horarios del periodo.`,
      cantidad: resultado.count
    };
  }
}
