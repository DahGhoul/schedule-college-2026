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
    tipoClase: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    sesionId: string;
  }) {
    await GestorSeleccionTemporal.seleccionarCelda(datos);

    // Publicar evento para notificar a otros clientes
    await redis.publish(
      'canal:disponibilidad',
      JSON.stringify({ tipo: 'celda_seleccionada', idAmbiente: datos.idAmbiente })
    );

    return { mensaje: 'Celda seleccionada temporalmente' };
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