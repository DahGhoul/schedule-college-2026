import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { GestorSeleccionTemporal } from './gestor-seleccion-temporal.service';
import { ConflictoGlobal } from './horarios.types';
import { obtenerClavesPorPatron } from './redis-claves';
import { ValidadorHorario } from './validador-horario.service';

export class PublicadorHorarios {
  /**
   * Confirmar la selección de un docente: mueve de Redis a la BD en estado BORRADOR.
   * Se ejecuta dentro de una transacción para asegurar atomicidad.
   */
  static async confirmarSeleccion(idDocente: number, idPeriodo: number) {
    const selecciones = await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente);
    if (selecciones.length === 0) {
      throw new Error('No hay selecciones temporales para confirmar');
    }

    // Validar el conjunto de selecciones completas antes de confirmar
    const validacion = await ValidadorHorario.validarSeleccionCompleta(idDocente, idPeriodo);
    if (!validacion.valido) {
      throw new Error(
        `No se puede confirmar el horario debido a conflictos: ${validacion.conflictos.join(', ')}`
      );
    }

    return prisma.$transaction(async (tx) => {
      // Verificar conflictos antes de insertar
      for (const sel of selecciones) {
        if (sel.idAmbiente) {
          const conflicto = await tx.bloque_horario.findFirst({
            where: {
              id_periodo: idPeriodo,
              id_ambiente: sel.idAmbiente,
              dia_semana: sel.diaSemana,
              hora_inicio: sel.horaInicio,
              estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
            },
            include: {
              componente: {
                include: {
                  oferta: {
                    include: {
                      curso: true,
                    },
                  },
                },
              },
              ambiente: true,
            },
          });
          if (conflicto) {
            const esAmbienteLab = conflicto.ambiente?.tipo === 'LABORATORIO';
            const cursoOcupante = conflicto.componente.oferta.curso.nombre;

            if (esAmbienteLab) {
              throw new Error(
                `Laboratorio ocupado en esa hora y el curso que lo está ocupando: ${cursoOcupante}`
              );
            }

            throw new Error(
              `Conflicto: El ambiente ya está ocupado el ${sel.diaSemana} a las ${sel.horaInicio}`
            );
          }
        }

        const cruceDocente = await tx.bloque_horario.findFirst({
          where: {
            id_periodo: idPeriodo,
            id_docente: idDocente,
            dia_semana: sel.diaSemana,
            hora_inicio: sel.horaInicio,
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
        });
        if (cruceDocente) {
          throw new Error(
            `Conflicto: El docente ya tiene clase el ${sel.diaSemana} a las ${sel.horaInicio}`
          );
        }
      }

      // Insertar todas las selecciones en la BD
      const creados = [];
      for (const sel of selecciones) {
        const horario = await tx.bloque_horario.create({
          data: {
            id_periodo: idPeriodo,
            id_docente: sel.idDocente,
            id_componente: sel.idComponente,
            id_grupo: sel.idGrupo,
            id_ambiente: sel.idAmbiente || null,
            dia_semana: sel.diaSemana,
            hora_inicio: sel.horaInicio,
            hora_fin: sel.horaFin,
            estado: 'BORRADOR',
            pendiente_ambiente: !sel.idAmbiente,
          },
        });
        creados.push(horario);
      }

      // Limpiar selecciones temporales de Redis
      const claves = await obtenerClavesPorPatron('seleccion_temporal:*');
      for (const clave of claves) {
        const valor = await redis.get(clave);
        if (valor) {
          const sel = JSON.parse(valor);
          if (sel.idDocente === idDocente) {
            await redis.del(clave);
          }
        }
      }

      // Publicar evento de actualización
      await redis.publish(
        'canal:disponibilidad',
        JSON.stringify({ tipo: 'seleccion_confirmada', idDocente })
      );

      return creados;
    });
  }

  /**
   * Cambiar estado de un horario individual
   */
  static async cambiarEstadoHorario(idHorario: number, nuevoEstado: string, usuario: string) {
    const horario = await prisma.bloque_horario.findUnique({ where: { id: idHorario } });
    if (!horario) throw new Error('Horario no encontrado');

    const estadoAnterior = horario.estado;

    const actualizado = await prisma.bloque_horario.update({
      where: { id: idHorario },
      data: { estado: nuevoEstado },
    });

    // Registrar auditoría
    await prisma.auditoria_horario.create({
      data: {
        id_bloque_horario: idHorario,
        tipo_accion: 'CAMBIO_ESTADO',
        usuario,
        detalle: `Estado cambiado de ${estadoAnterior} a ${nuevoEstado}`,
        datos_anteriores: { estado: estadoAnterior },
      },
    });

    return actualizado;
  }

  /**
   * Publicar todos los horarios BORRADOR de un período (cambio masivo a PUBLICADO)
   */
  static async publicarPeriodo(idPeriodo: number, usuario: string) {
    return prisma.$transaction(async (tx) => {
      const horarios = await tx.bloque_horario.findMany({
        where: { id_periodo: idPeriodo, estado: 'BORRADOR' },
      });

      if (horarios.length === 0) {
        throw new Error('No hay horarios en borrador para publicar');
      }

      // Verificar conflictos globales antes de publicar
      const conflictos = await this.detectarConflictos(idPeriodo);
      if (conflictos.length > 0) {
        throw new Error('Existen conflictos que deben resolverse antes de publicar');
      }

      await tx.bloque_horario.updateMany({
        where: { id_periodo: idPeriodo, estado: 'BORRADOR' },
        data: { estado: 'PUBLICADO' },
      });

      // Registrar auditoría masiva
      for (const h of horarios) {
        await tx.auditoria_horario.create({
          data: {
            id_bloque_horario: h.id,
            tipo_accion: 'PUBLICAR',
            usuario,
            detalle: 'Horario publicado',
          },
        });
      }

      return { mensaje: `${horarios.length} horarios publicados` };
    });
  }

  /**
   * Despublicar todos los horarios de un período (PUBLICADO → BORRADOR)
   */
  static async despublicarPeriodo(idPeriodo: number, usuario: string) {
    return prisma.$transaction(async (tx) => {
      const horarios = await tx.bloque_horario.findMany({
        where: { id_periodo: idPeriodo, estado: 'PUBLICADO' },
      });

      if (horarios.length === 0) {
        throw new Error('No hay horarios publicados para despublicar');
      }

      await tx.bloque_horario.updateMany({
        where: { id_periodo: idPeriodo, estado: 'PUBLICADO' },
        data: { estado: 'BORRADOR' },
      });

      for (const h of horarios) {
        await tx.auditoria_horario.create({
          data: {
            id_bloque_horario: h.id,
            tipo_accion: 'DESPUBLICAR',
            usuario,
            detalle: 'Horario despublicado',
          },
        });
      }

      return { mensaje: `${horarios.length} horarios despublicados` };
    });
  }

  /**
   * Detectar conflictos globales en un período
   */
  static async detectarConflictos(idPeriodo: number): Promise<ConflictoGlobal[]> {
    const conflictos: ConflictoGlobal[] = [];

    // 1. Cruce de docente (mismo docente, mismo día/hora)
    const crucesDocente = await prisma.$queryRaw<Array<{ id_docente: number; dia_semana: string; hora_inicio: string; count: number }>>`
      SELECT id_docente, dia_semana, hora_inicio, COUNT(*) as count
      FROM bloque_horario
      WHERE id_periodo = ${idPeriodo}
        AND estado IN ('CONFIRMADO', 'PUBLICADO', 'BORRADOR')
      GROUP BY id_docente, dia_semana, hora_inicio
      HAVING COUNT(*) > 1
    `;

    for (const cruce of crucesDocente) {
      const docente = await prisma.docente.findUnique({ where: { id: cruce.id_docente } });
      conflictos.push({
        tipo: 'CRUCE_DOCENTE',
        descripcion: `El docente ${docente?.nombres} ${docente?.apellidos} tiene ${cruce.count} clases el ${cruce.dia_semana} a las ${cruce.hora_inicio}`,
        involucrados: [`Docente ID ${cruce.id_docente}`],
      });
    }

    // 2. Cruce de ambiente (mismo ambiente, mismo día/hora)
    const crucesAmbiente = await prisma.$queryRaw<Array<{ id_ambiente: number; dia_semana: string; hora_inicio: string; count: number }>>`
      SELECT id_ambiente, dia_semana, hora_inicio, COUNT(*) as count
      FROM bloque_horario
      WHERE id_periodo = ${idPeriodo}
        AND id_ambiente IS NOT NULL
        AND estado IN ('CONFIRMADO', 'PUBLICADO', 'BORRADOR')
      GROUP BY id_ambiente, dia_semana, hora_inicio
      HAVING COUNT(*) > 1
    `;

    for (const cruce of crucesAmbiente) {
      const ambiente = await prisma.ambiente.findUnique({ where: { id: cruce.id_ambiente } });
      
      // EXCEPCIÓN: Si es un LABORATORIO, se permiten múltiples grupos si todos son del tipo LABORATORIO
      if (ambiente?.tipo === 'LABORATORIO') {
        const bloques = await prisma.bloque_horario.findMany({
          where: {
            id_periodo: idPeriodo,
            id_ambiente: cruce.id_ambiente,
            dia_semana: cruce.dia_semana,
            hora_inicio: cruce.hora_inicio,
            estado: { in: ['CONFIRMADO', 'PUBLICADO', 'BORRADOR'] },
          },
          include: { componente: true },
        });

        const todosSonLab = bloques.every(b => b.componente.tipo === 'LABORATORIO');
        if (todosSonLab) continue; // No es un conflicto real para laboratorios
      }

      conflictos.push({
        tipo: 'CRUCE_AMBIENTE',
        descripcion: `El ambiente ${ambiente?.codigo} tiene ${cruce.count} reservas el ${cruce.dia_semana} a las ${cruce.hora_inicio}`,
        involucrados: [`Ambiente ID ${cruce.id_ambiente}`],
      });
    }

    // 3. Cruce de grupo (mismo grupo, mismo día/hora)
    const crucesGrupo = await prisma.$queryRaw<Array<{ id_grupo: number; dia_semana: string; hora_inicio: string; count: number }>>`
      SELECT id_grupo, dia_semana, hora_inicio, COUNT(*) as count
      FROM bloque_horario
      WHERE id_periodo = ${idPeriodo}
        AND id_grupo IS NOT NULL
        AND estado IN ('CONFIRMADO', 'PUBLICADO', 'BORRADOR')
      GROUP BY id_grupo, dia_semana, hora_inicio
      HAVING COUNT(*) > 1
    `;

    for (const cruce of crucesGrupo) {
      const grupo = await prisma.grupo.findUnique({
        where: { id: cruce.id_grupo },
        include: { componente: { include: { oferta: { include: { curso: true } } } } },
      });
      conflictos.push({
        tipo: 'CRUCE_GRUPO',
        descripcion: `El grupo ${grupo?.codigo} de ${grupo?.componente.oferta.curso.nombre} tiene ${cruce.count} clases el ${cruce.dia_semana} a las ${cruce.hora_inicio}`,
        involucrados: [`Grupo ID ${cruce.id_grupo}`],
      });
    }

    // 4. Cruce de Ciclo (NUEVO: Validar que un ciclo no tenga cruces, excepto laboratorios)
    const crucesCiclo = await prisma.$queryRaw<Array<{ id_ciclo: number; dia_semana: string; hora_inicio: string; count: number }>>`
      SELECT o.id_ciclo, b.dia_semana, b.hora_inicio, COUNT(*) as count
      FROM bloque_horario b
      JOIN curso_componente c ON b.id_componente = c.id_componente
      JOIN curso_oferta o ON c.id_oferta = o.id_curso_oferta
      WHERE b.id_periodo = ${idPeriodo}
        AND b.estado IN ('CONFIRMADO', 'PUBLICADO', 'BORRADOR')
      GROUP BY o.id_ciclo, b.dia_semana, b.hora_inicio
      HAVING COUNT(*) > 1
    `;

    for (const cruce of crucesCiclo) {
      const bloques = await prisma.bloque_horario.findMany({
        where: {
          id_periodo: idPeriodo,
          dia_semana: cruce.dia_semana,
          hora_inicio: cruce.hora_inicio,
          componente: {
            oferta: { id_ciclo: cruce.id_ciclo }
          },
          estado: { in: ['CONFIRMADO', 'PUBLICADO', 'BORRADOR'] },
        },
        include: { 
          componente: { 
            include: { oferta: { include: { curso: true, ciclo: true } } } 
          } 
        },
      });

      // EXCEPCIÓN: Se permiten múltiples si TODOS son del tipo LABORATORIO
      const todosSonLab = bloques.every(b => b.componente.tipo === 'LABORATORIO');
      if (todosSonLab) continue;

      const ciclo = bloques[0]?.componente.oferta.ciclo;
      conflictos.push({
        tipo: 'CRUCE_CICLO',
        descripcion: `El ciclo ${ciclo?.numero} tiene ${cruce.count} cursos programados el ${cruce.dia_semana} a las ${cruce.hora_inicio}`,
        involucrados: [`Ciclo ID ${cruce.id_ciclo}`],
      });
    }

    return conflictos;
  }
}
