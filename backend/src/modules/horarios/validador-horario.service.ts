import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { ValidacionResultado } from './horarios.types';
import { TipoCurso } from '@prisma/client';
import { obtenerClavesPorPatron } from './redis-claves';

export class ValidadorHorario {
  static async validarSeleccionCompleta(
    idDocente: number,
    idPeriodo: number
  ): Promise<ValidacionResultado> {
    const conflictos: string[] = [];
    const advertencias: string[] = [];

    // Obtener restricciones institucionales
    const configs = await prisma.configuracion.findMany({
      where: { id_periodo: idPeriodo },
    });
    const mapaConfig: Record<string, string> = {};
    configs.forEach((c) => (mapaConfig[c.clave] = c.valor));

    const horasMaxDiarias = parseInt(mapaConfig['HORAS_MAX_DIARIAS'] || '8');
    const franjaInicio = mapaConfig['FRANJA_INICIO'] || '07:00';
    const franjaFin = mapaConfig['FRANJA_FIN'] || '22:00';
    const almuerzoInicio = mapaConfig['BLOQUEO_ALMUERZO_INICIO'] || '12:00';
    const almuerzoFin = mapaConfig['BLOQUEO_ALMUERZO_FIN'] || '13:00';

    // Obtener selecciones temporales del docente desde Redis
    const claves = await obtenerClavesPorPatron('seleccion_temporal:*');
    const seleccionesDocente: any[] = [];
    for (const clave of claves) {
      const valor = await redis.get(clave);
      if (valor) {
        const sel = JSON.parse(valor);
        if (sel.idDocente === idDocente) {
          seleccionesDocente.push({
            ...sel,
            confirmado: false,
          });
        }
      }
    }

    // Obtener bloques confirmados del docente desde la BD
    const bloquesBD = await prisma.bloque_horario.findMany({
      where: {
        id_docente: idDocente,
        id_periodo: idPeriodo,
      },
    });
    for (const bloque of bloquesBD) {
      seleccionesDocente.push({
        idDocente: bloque.id_docente,
        idComponente: bloque.id_componente,
        idGrupo: bloque.id_grupo,
        idAmbiente: bloque.id_ambiente || undefined,
        diaSemana: bloque.dia_semana,
        horaInicio: bloque.hora_inicio,
        horaFin: bloque.hora_fin,
        confirmado: true,
        idBloqueHorario: bloque.id,
      });
    }

    // 1. Validar horas máximas diarias
    const horasPorDia: Record<string, number> = {};
    for (const sel of seleccionesDocente) {
      horasPorDia[sel.diaSemana] = (horasPorDia[sel.diaSemana] || 0) + 1;
    }
    for (const [dia, horas] of Object.entries(horasPorDia)) {
      if (horas > horasMaxDiarias) {
        conflictos.push(`Excede horas máximas diarias (${horas}/${horasMaxDiarias}) el ${dia}`);
      }
    }

    // 2. Validar cruces y reglas de negocio (REGULAR vs ELECTIVO)
    for (const sel of seleccionesDocente) {
      const componenteActual = await prisma.curso_componente.findUnique({
        where: { id: sel.idComponente },
        include: { oferta: { include: { ... (sel.confirmado ? {} : { curso: true }) } } } as any, // prevent TS warnings
      });

      // Let's query details manually to avoid Prisma includes issues if any
      const componente = await prisma.curso_componente.findUnique({
        where: { id: sel.idComponente },
        include: { oferta: { include: { curso: true } } },
      });

      if (!componente) {
        conflictos.push(`Conflicto: Componente inválido (ID ${sel.idComponente})`);
        continue;
      }

      const tipoCursoActual = componente.oferta.tipo_curso;

      // Cruce con otros bloques del MISMO docente (ya confirmados)
      const cruceConfirmado = await prisma.bloque_horario.findFirst({
        where: {
          id_docente: idDocente,
          id_periodo: idPeriodo,
          dia_semana: sel.diaSemana,
          hora_inicio: sel.horaInicio,
          estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          ...(sel.confirmado && { NOT: { id: sel.idBloqueHorario } }),
        },
        include: { componente: { include: { oferta: true } } }
      });

      if (cruceConfirmado) {
        const tipoCruce = cruceConfirmado.componente.oferta.tipo_curso;
        
        // Regla: No se puede cruzar REGULAR con nada.
        if (tipoCursoActual === TipoCurso.REGULAR || tipoCruce === TipoCurso.REGULAR) {
          conflictos.push(
            `Conflicto: El curso OBLIGATORIO ${componente.oferta.curso.nombre} se cruza el ${sel.diaSemana} a las ${sel.horaInicio}`
          );
        } else {
          // Si ambos son ELECTIVO, se permite el cruce (según requerimiento)
          advertencias.push(`Nota: Cruce de cursos ELECTIVOS el ${sel.diaSemana} a las ${sel.horaInicio}`);
        }
      }

      // Regla: En REGULAR, Teoría no se cruza con Laboratorio del mismo docente (aunque sea otro curso)
      if (tipoCursoActual === TipoCurso.REGULAR) {
        const esLabActual = componente.tipo === 'LABORATORIO';
        const esTeoriaActual = componente.tipo === 'TEORIA';

        if (esLabActual || esTeoriaActual) {
          const tipoBuscado = esLabActual ? 'TEORIA' : 'LABORATORIO';
          const cruceLabTeoria = await prisma.bloque_horario.findFirst({
            where: {
              id_docente: idDocente,
              id_periodo: idPeriodo,
              dia_semana: sel.diaSemana,
              hora_inicio: sel.horaInicio,
              componente: { tipo: tipoBuscado, oferta: { tipo_curso: TipoCurso.REGULAR } },
              estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
              ...(sel.confirmado && { NOT: { id: sel.idBloqueHorario } }),
            }
          });
          if (cruceLabTeoria) {
            conflictos.push(`Conflicto: No se permite cruce de Laboratorio y Teoría en cursos OBLIGATORIOS`);
          }
        }
      }
    }

    // 3. Validar bloqueo de almuerzo
    for (const sel of seleccionesDocente) {
      if (sel.horaInicio >= almuerzoInicio && sel.horaInicio < almuerzoFin) {
        conflictos.push(
          `Conflicto: Bloqueo de almuerzo el ${sel.diaSemana} a las ${sel.horaInicio}`
        );
      }
    }

    // 4. Validar franja institucional
    for (const sel of seleccionesDocente) {
      if (sel.horaInicio < franjaInicio || sel.horaFin > franjaFin) {
        conflictos.push(
          `Conflicto: Fuera de franja horaria el ${sel.diaSemana} a las ${sel.horaInicio}`
        );
      }
    }

    // 5. Validar disponibilidad del ambiente (cruces con otros docentes)
    for (const sel of seleccionesDocente) {
      if (!sel.idAmbiente) continue;
      const conflictoAmbiente = await prisma.bloque_horario.findFirst({
        where: {
          id_periodo: idPeriodo,
          id_ambiente: sel.idAmbiente,
          dia_semana: sel.diaSemana,
          hora_inicio: sel.horaInicio,
          estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          NOT: { id_docente: idDocente },
        },
      });
      if (conflictoAmbiente) {
        conflictos.push(
          `Conflicto: El ambiente ya está ocupado el ${sel.diaSemana} a las ${sel.horaInicio}`
        );
      }
    }

    // 6. Validar horas requeridas
    const asignaciones = await prisma.asignacion_docente_componente.findMany({
      where: { id_docente: idDocente },
      include: { componente: { include: { oferta: { include: { curso: true } }, grupos: true } } },
    });
    for (const a of asignaciones) {
      const nGrupos = a.componente.grupos?.length || 1;
      const horasPorGrupo = a.componente.horas_requeridas / nGrupos;
      const maxGrupos = Math.round(a.horas_asignadas / horasPorGrupo);

      const seleccionesComp = seleccionesDocente.filter((s) => s.idComponente === a.id_componente);
      const countSelecciones = seleccionesComp.length;

      if (a.horas_asignadas > 0 && countSelecciones < a.horas_asignadas) {
        advertencias.push(
          `Faltan ${a.horas_asignadas - countSelecciones}h de ${a.componente.tipo} para ${a.componente.oferta.curso.nombre}`
        );
      }
      if (a.horas_asignadas > 0 && countSelecciones > a.horas_asignadas) {
        conflictos.push(
          `Conflicto: Se han asignado más horas de las requeridas para ${a.componente.oferta.curso.nombre} (${countSelecciones}/${a.horas_asignadas}h)`
        );
      }

      // Validar límite de horas por grupo
      const horasPorGrupoMap: Record<number, number> = {};
      for (const s of seleccionesComp) {
        horasPorGrupoMap[s.idGrupo] = (horasPorGrupoMap[s.idGrupo] || 0) + 1;
      }

      for (const [idGrupoStr, horas] of Object.entries(horasPorGrupoMap)) {
        if (horas > horasPorGrupo) {
          const grupoObj = a.componente.grupos.find((g) => g.id === parseInt(idGrupoStr));
          conflictos.push(
            `Conflicto: El grupo ${grupoObj?.codigo || idGrupoStr} de ${a.componente.oferta.curso.nombre} excede su límite de ${horasPorGrupo}h (${horas}h seleccionadas)`
          );
        }
      }

      // Validar cantidad máxima de grupos
      const uniqueGrupos = Object.keys(horasPorGrupoMap);
      if (uniqueGrupos.length > maxGrupos) {
        conflictos.push(
          `Conflicto: Has seleccionado horarios para ${uniqueGrupos.length} grupos de ${a.componente.oferta.curso.nombre}, pero solo tienes asignados máximo ${maxGrupos} grupo(s)`
        );
      }
    }

    return {
      valido: conflictos.length === 0,
      conflictos,
      advertencias,
    };
  }
}
