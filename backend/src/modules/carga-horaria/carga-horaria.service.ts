import { prisma } from '@/lib/prisma';
import { TipoComponente } from '@prisma/client';
import { PeriodosService } from '../periodos/periodos.service';

export class CargaHorariaService {
  /**
   * Asignar carga horaria a un docente para un componente específico
   */
  static async asignarCarga(datos: {
    id_componente: number;
    id_docente: number;
    horas_asignadas: number;
  }) {
    const { id_componente, id_docente, horas_asignadas } = datos;

    // 1. Validar existencia de componente y docente
    const [componente, docente] = await Promise.all([
      prisma.curso_componente.findUnique({
        where: { id: id_componente },
        include: { oferta: true, asignaciones: true, grupos: true }
      }),
      prisma.docente.findUnique({
        where: { id: id_docente },
        include: { asignaciones: {
          include: {
            componente: {
              include: {
                oferta: true
              }
            }
          }
        } }
      })
    ]);

    if (!componente) throw new Error('Componente no encontrado');
    if (!docente) throw new Error('Docente no encontrado');

    const id_periodo = componente.oferta.id_periodo;

    // 1.5. Validar que las horas asignadas sean un múltiplo exacto de las horas por grupo (Solo para LABORATORIO)
    if (componente.tipo === 'LABORATORIO') {
      const nGrupos = componente.grupos?.length || 1;
      const horasPorGrupo = componente.horas_requeridas / nGrupos;
      const numGruposAsignados = horas_asignadas / horasPorGrupo;

      if (Math.abs(numGruposAsignados - Math.round(numGruposAsignados)) > 0.01) {
        throw new Error(
          `Para Laboratorios, las horas asignadas (${horas_asignadas}h) deben ser un múltiplo exacto de las horas del grupo (${horasPorGrupo}h).`
        );
      }
    }

    // 2. Validar límite legal de horas del docente en el periodo actual
    const horasActualesPeriodo = docente.asignaciones
      .filter(asig => asig.componente.oferta.id_periodo === id_periodo && asig.id_componente !== id_componente)
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);
    
    const limiteLegal = docente.horas_max_semana || 40;

    if (horasActualesPeriodo + horas_asignadas > limiteLegal) {
      throw new Error(`El docente ha excedido su límite legal de ${limiteLegal} horas semanales para este periodo (Actual en otros cursos: ${horasActualesPeriodo}, Nueva: ${horas_asignadas})`);
    }

    // 3. Validar si el total de horas del componente no se excede
    const totalHorasRequeridas = componente.horas_requeridas;
    const totalAsignadoOtros = componente.asignaciones
      .filter(asig => asig.id_docente !== id_docente)
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);

    if (totalAsignadoOtros + horas_asignadas > totalHorasRequeridas) {
      throw new Error(`Las horas asignadas superan el requerimiento del componente (${totalHorasRequeridas}h). Faltan por asignar: ${totalHorasRequeridas - totalAsignadoOtros}h`);
    }

    // 4. Activar multi-docente automáticamente si hay más de una asignación
    if (componente.asignaciones.length > 0 || (totalAsignadoOtros > 0)) {
      await prisma.curso_componente.update({
        where: { id: id_componente },
        data: { permite_multi_docente: true }
      });
    }

    // 5. Upsert de la asignación
    return prisma.asignacion_docente_componente.upsert({
      where: {
        id_componente_id_docente: {
          id_componente: id_componente,
          id_docente: id_docente
        }
      },
      update: {
        horas_asignadas: horas_asignadas
      },
      create: {
        id_componente: id_componente,
        id_docente: id_docente,
        horas_asignadas: horas_asignadas
      }
    });
  }

  /**
   * Obtener resumen de carga horaria por periodo
   */
  static async obtenerResumenCarga(id_periodo: number) {
    return prisma.docente.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        modalidad: true,
        categoria: true,
        horas_max_semana: true,
        asignaciones: {
          where: {
            componente: {
              oferta: {
                id_periodo
              }
            }
          },
          include: {
            componente: {
              include: {
                oferta: {
                  include: {
                    curso: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  static async configurarOferta(datos: {
    id_periodo: number;
    id_curso: number;
    id_ciclo: number;
    tipo_curso: 'REGULAR' | 'ELECTIVO';
    componentes: Array<{
      tipo: TipoComponente;
      horas_requeridas: number;
      n_grupos: number; // Para laboratorios puede ser > 1
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Validar que no se dupliquen los tipos de componentes en la solicitud
      const tiposEnSolicitud = datos.componentes.map(c => c.tipo);
      const tieneDuplicados = new Set(tiposEnSolicitud).size !== tiposEnSolicitud.length;
      if (tieneDuplicados) {
        throw new Error('No se pueden incluir componentes duplicados en la misma solicitud.');
      }

      // Validar tipos permitidos (TEORIA para TEORIA-PRACTICA y LABORATORIO)
      const tiposPermitidos = ['TEORIA', 'LABORATORIO'];
      for (const t of tiposEnSolicitud) {
        if (!tiposPermitidos.includes(t)) {
          throw new Error(`El tipo de componente "${t}" ya no está permitido. Use TEORÍA-PRÁCTICA o LABORATORIO.`);
        }
      }

      // 2. Crear o encontrar la oferta
      const oferta = await tx.curso_oferta.upsert({
        where: {
          id_periodo_id_curso_id_ciclo: {
            id_periodo: datos.id_periodo,
            id_curso: datos.id_curso,
            id_ciclo: datos.id_ciclo
          }
        },
        update: {
          tipo_curso: datos.tipo_curso,
          estado: 'BORRADOR'
        },
        create: {
          id_periodo: datos.id_periodo,
          id_curso: datos.id_curso,
          id_ciclo: datos.id_ciclo,
          tipo_curso: datos.tipo_curso,
          estado: 'BORRADOR'
        },
        include: {
          componentes: {
            include: {
              grupos: true
            }
          }
        }
      });

      // 3. Validar componentes duplicados en el payload
      const tiposEnPayload = datos.componentes.map(c => c.tipo);
      const duplicados = tiposEnPayload.filter((item, index) => tiposEnPayload.indexOf(item) !== index);
      if (duplicados.length > 0) {
        throw new Error(`No se puede enviar el mismo tipo de componente (${duplicados.join(', ')}) varias veces.`);
      }

      // 3.5. Eliminar componentes que ya no están en la solicitud
      const componentesAEliminar = oferta.componentes.filter(c => !tiposEnPayload.includes(c.tipo));

      for (const compAEliminar of componentesAEliminar) {
        // Verificar si tiene asignaciones o grupos con horarios
        const tieneAsignaciones = await tx.asignacion_docente_componente.findFirst({ where: { id_componente: compAEliminar.id } });
        const tieneHorarios = await tx.bloque_horario.findFirst({ where: { id_componente: compAEliminar.id } });
        
        if (tieneAsignaciones || tieneHorarios) {
          throw new Error(`No se puede eliminar el componente ${compAEliminar.tipo === 'TEORIA' ? 'TEORÍA-PRÁCTICA' : 'LABORATORIO'} porque ya tiene carga docente o horarios asignados.`);
        }

        // Eliminar grupos asociados
        await tx.grupo.deleteMany({ where: { id_componente: compAEliminar.id } });
        // Eliminar componente
        await tx.curso_componente.delete({ where: { id: compAEliminar.id } });
      }

      // 4. Procesar componentes (actualizar o crear)
      const resultados = [];
      for (const comp of datos.componentes) {
        // CÁLCULO DEFINITIVO: Horas por Grupo * Número de Grupos (Trabajando con ENTEROS)
        const horasPorGrupo = Math.round(parseFloat(String(comp.horas_requeridas)));
        const cantidadGrupos = Math.round(parseInt(String(comp.n_grupos))) || 1;
        const totalHoras = horasPorGrupo * cantidadGrupos;

        console.log(`[OFERTA_AUDIT] Componente: ${comp.tipo} | h/grupo: ${horasPorGrupo} | grupos: ${cantidadGrupos} | TOTAL: ${totalHoras}`);

        // Buscar si ya existe el componente en esta oferta
        const componenteExistente = oferta.componentes.find(c => c.tipo === comp.tipo);

        let componente;
        if (componenteExistente) {
          // Si existe, actualizar con el total MULTIPLICADO
          componente = await tx.curso_componente.update({
            where: { id: componenteExistente.id },
            data: {
              horas_requeridas: totalHoras,
              permite_multi_docente: true
            }
          });

          // Gestionar Grupos
          const gruposActuales = await tx.grupo.findMany({ where: { id_componente: componente.id } });
          if (gruposActuales.length !== cantidadGrupos) {
            const tieneHorarios = await tx.bloque_horario.findFirst({ where: { id_componente: componente.id } });
            if (tieneHorarios) {
              throw new Error(`No se puede cambiar el número de grupos para ${comp.tipo} porque ya tiene horarios asignados.`);
            }
            
            await tx.grupo.deleteMany({ where: { id_componente: componente.id } });
            for (let i = 0; i < cantidadGrupos; i++) {
              await tx.grupo.create({
                data: {
                  id_componente: componente.id,
                  codigo: String.fromCharCode(65 + i),
                  capacidad_maxima: comp.tipo === 'LABORATORIO' ? 20 : 40
                }
              });
            }
          }
        } else {
          // Crear nuevo componente con horas totales multiplicadas
          componente = await tx.curso_componente.create({
            data: {
              id_oferta: oferta.id,
              tipo: comp.tipo,
              horas_requeridas: totalHoras,
              permite_multi_docente: true
            }
          });

          // Crear grupos iniciales
          for (let i = 0; i < cantidadGrupos; i++) {
            await tx.grupo.create({
              data: {
                id_componente: componente.id,
                codigo: cantidadGrupos === 1 && comp.tipo === 'TEORIA' ? 'UNICO' : String.fromCharCode(65 + i),
                capacidad_maxima: comp.tipo === 'LABORATORIO' ? 20 : 40
              }
            });
          }
        }
        resultados.push(componente);
      }

      return { ...oferta, componentes: resultados };
    });
  }

  /**
   * Actualizar una asignación de carga horaria
   */
  static async actualizarAsignacion(id: number, datos: { horas_asignadas: number }) {
    const asignacion = await prisma.asignacion_docente_componente.findUnique({
      where: { id },
      include: { componente: { include: { grupos: true } } }
    });

    if (!asignacion) throw new Error('Asignación no encontrada');

    // Validar bloques para Laboratorio
    if (asignacion.componente.tipo === 'LABORATORIO') {
      const nGrupos = asignacion.componente.grupos?.length || 1;
      const horasPorGrupo = asignacion.componente.horas_requeridas / nGrupos;
      const numGruposAsignados = datos.horas_asignadas / horasPorGrupo;

      if (Math.abs(numGruposAsignados - Math.round(numGruposAsignados)) > 0.01) {
        throw new Error(
          `Para Laboratorios, las horas asignadas (${datos.horas_asignadas}h) deben ser un múltiplo exacto de las horas del grupo (${horasPorGrupo}h).`
        );
      }
    }

    return prisma.asignacion_docente_componente.update({
      where: { id },
      data: {
        horas_asignadas: Math.round(datos.horas_asignadas)
      }
    });
  }

  /**
   * Eliminar una asignación de carga horaria
   */
  static async eliminarAsignacion(id_asignacion: number) {
    return prisma.asignacion_docente_componente.delete({
      where: { id: id_asignacion }
    });
  }

  /**
   * Eliminar una oferta de curso (de manera lógica)
   */
  static async eliminarOferta(id_oferta: number) {
    // 1. Verificar si tiene bloques horarios (clases programadas)
    const tieneHorarios = await prisma.bloque_horario.findFirst({
      where: { id_componente: { in: (await prisma.curso_componente.findMany({ where: { id_oferta }, select: { id: true } })).map(c => c.id) } }
    });

    if (tieneHorarios) {
      throw new Error('No se puede eliminar la oferta porque ya tiene horarios programados. Elimine primero los bloques horarios.');
    }

    // 2. Eliminación lógica: cambiar estado a ELIMINADO
    return prisma.curso_oferta.update({
      where: { id: id_oferta },
      data: { estado: 'ELIMINADO' }
    });
  }

  /**
   * Obtener detalle de una oferta específica
   */
  static async obtenerOfertaDetalle(id_periodo: number, id_curso: number, id_ciclo: number) {
    return prisma.curso_oferta.findUnique({
      where: {
        id_periodo_id_curso_id_ciclo: {
          id_periodo,
          id_curso,
          id_ciclo
        }
      },
      include: {
        componentes: {
          include: {
            grupos: true
          }
        }
      }
    });
  }

  /**
   * Obtener ciclos de un período específico que tengan oferta académica activa
   */
  static async obtenerCiclosPorPeriodo(id_periodo: number) {
    // First get allowed cycle numbers from the period's type
    const periodo = await prisma.periodo_academico.findUnique({
      where: { id: id_periodo }
    });
    
    if (!periodo) return [];
    
    const allowedNumbers = PeriodosService.getNumerosCiclosPermitidos(periodo.tipo);
    
    return prisma.ciclo.findMany({
      where: { 
        id_periodo,
        numero: { in: allowedNumbers },
        ofertas: {
          some: {
            estado: { not: 'ELIMINADO' }
          }
        }
      },
      orderBy: { numero: 'asc' }
    });
  }

  /**
   * Obtener cursos con oferta por período y ciclo
   */
  static async obtenerCursosPorCiclo(id_periodo: number, id_ciclo?: number) {
    const where: any = { 
      id_periodo,
      estado: { not: 'ELIMINADO' }
    };
    if (id_ciclo) {
      where.id_ciclo = id_ciclo;
    }
    
    return prisma.curso_oferta.findMany({
      where,
      include: {
        curso: true,
        ciclo: true,
        componentes: {
          include: {
            grupos: true, // INCLUIR GRUPOS PARA CALCULAR n_grupos EN FRONTEND
            asignaciones: {
              include: {
                docente: true
              }
            }
          }
        }
      },
      orderBy: { curso: { nombre: 'asc' } }
    });
  }
}
