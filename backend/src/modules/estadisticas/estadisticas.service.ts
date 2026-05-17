import { prisma } from '@/lib/prisma';

export class EstadisticasService {
  static async obtenerResumen(idPeriodo: number) {
    const totalDocentes = await prisma.docente.count({ where: { activo: true } });
    const totalCursos = await prisma.curso.count();
    const totalAmbientes = await prisma.ambiente.count({ where: { activo: true } });
    const horariosAsignados = await prisma.horario_asignado.count({
      where: { id_periodo: idPeriodo, estado: { in: ['CONFIRMADO', 'PUBLICADO'] } },
    });
    const horariosBorrador = await prisma.horario_asignado.count({
      where: { id_periodo: idPeriodo, estado: 'BORRADOR' },
    });
    const totalHorarios = horariosAsignados + horariosBorrador;

    return {
      totalDocentes,
      totalCursos,
      totalAmbientes,
      horariosAsignados,
      horariosBorrador,
      totalHorarios,
      porcentajeAsignado: totalHorarios > 0 ? Math.round((horariosAsignados / totalHorarios) * 100) : 0,
    };
  }

  static async obtenerAvancePorCategoria(idPeriodo: number) {
    const categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
    const modalidades = ['NOMBRADO', 'CONTRATADO'];
    const resultado: any[] = [];

    for (const modalidad of modalidades) {
      for (const categoria of categorias) {
        const docentes = await prisma.docente.findMany({
          where: { modalidad, categoria, activo: true },
          select: { id: true, nombres: true, apellidos: true },
        });
        const ids = docentes.map((d) => d.id);
        const asignados = await prisma.horario_asignado.count({
          where: {
            id_periodo: idPeriodo,
            id_docente: { in: ids },
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
        });
        const pendientes = await prisma.horario_asignado.count({
          where: {
            id_periodo: idPeriodo,
            id_docente: { in: ids },
            estado: 'BORRADOR',
          },
        });
        resultado.push({
          modalidad,
          categoria,
          totalDocentes: docentes.length,
          horariosAsignados: asignados,
          horariosPendientes: pendientes,
        });
      }
    }
    return resultado;
  }

  static async obtenerOcupacionAmbientes(idPeriodo: number) {
    const ambientes = await prisma.ambiente.findMany({
      where: { activo: true },
      include: {
        horarios: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
        },
      },
    });
    return ambientes.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      capacidad: a.capacidad,
      ocupados: a.horarios.length,
    }));
  }

  static async obtenerMapaCalor(idPeriodo: number) {
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      '07:00','08:00','09:00','10:00','11:00','12:00','13:00',
      '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
    ];

    const horarios = await prisma.horario_asignado.findMany({
      where: {
        id_periodo: idPeriodo,
        estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
      },
      select: { dia_semana: true, hora_inicio: true },
    });

    const conteo: Record<string, number> = {};
    for (const dia of dias) {
      for (const hora of horas) {
        const key = `${dia}-${hora}`;
        conteo[key] = horarios.filter((h) => h.dia_semana === dia && h.hora_inicio === hora).length;
      }
    }
    return { dias, horas, conteo };
  }

  static async obtenerCargaDocente(idPeriodo: number) {
    const docentes = await prisma.docente.findMany({
      where: { activo: true },
      include: {
        horarios: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
        },
        cursos_dictados: {
          include: { curso: true },
        },
      },
    });

    return docentes.map((d) => {
      const horasAsignadas = d.horarios.length;
      const horasRequeridas =
        d.cursos_dictados.reduce((sum, dc) => sum + dc.curso.horas_teoria + dc.curso.horas_laboratorio, 0);
      return {
        id: d.id,
        nombres: d.nombres,
        apellidos: d.apellidos,
        modalidad: d.modalidad,
        categoria: d.categoria,
        horasAsignadas,
        horasRequeridas,
        porcentajeCumplimiento: horasRequeridas > 0 ? Math.round((horasAsignadas / horasRequeridas) * 100) : 0,
      };
    });
  }
}