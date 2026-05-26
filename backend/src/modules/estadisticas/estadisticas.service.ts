import { prisma } from '@/lib/prisma';

const minutosDesdeHora = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
};

const duracionHoras = (inicio: string, fin: string) => {
  const minutos = minutosDesdeHora(fin) - minutosDesdeHora(inicio);
  return minutos > 0 ? minutos / 60 : 0;
};

export class EstadisticasService {
  private static getLimaParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const find = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return {
      y: find('year'),
      m: find('month') - 1,
      d: find('day'),
      h: find('hour'),
      min: find('minute'),
    };
  }

  // ──────────────────────────────────────────
  // Existing methods
  // ──────────────────────────────────────────
  static async obtenerResumen(idPeriodo: number) {
    const totalDocentes = await prisma.docente.count({ where: { activo: true } });
    const totalCursos = await prisma.curso.count();
    const totalAmbientes = await prisma.ambiente.count({ where: { activo: true } });
    const horariosAsignados = await prisma.bloque_horario.count({
      where: { id_periodo: idPeriodo, estado: { in: ['CONFIRMADO', 'PUBLICADO'] } },
    });
    const horariosBorrador = await prisma.bloque_horario.count({
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
        const asignados = await prisma.bloque_horario.count({
          where: {
            id_periodo: idPeriodo,
            id_docente: { in: ids },
            estado: { in: ['CONFIRMADO', 'PUBLICADO'] },
          },
        });
        const pendientes = await prisma.bloque_horario.count({
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
        bloques: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
        },
      },
    });
    return ambientes.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      capacidad: a.capacidad,
      ocupados: a.bloques.length,
    }));
  }

  static async obtenerMapaCalor(idPeriodo: number) {
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      '07:00','08:00','09:00','10:00','11:00','12:00','13:00',
      '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
    ];

    const horarios = await prisma.bloque_horario.findMany({
      where: {
        id_periodo: idPeriodo,
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
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
        bloques: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          select: { hora_inicio: true, hora_fin: true },
        },
        asignaciones: {
          include: { componente: true },
        },
      },
    });

    return docentes.map((d) => {
      const horasAsignadas = d.bloques.reduce((sum, b) => sum + duracionHoras(b.hora_inicio, b.hora_fin), 0);
      const horasRequeridas = d.asignaciones.reduce((sum, a) => sum + a.horas_asignadas, 0);
      return {
        id: d.id,
        nombres: d.nombres,
        apellidos: d.apellidos,
        email: d.email,
        telefono: d.telefono,
        modalidad: d.modalidad,
        categoria: d.categoria,
        horasAsignadas,
        horasRequeridas,
        porcentajeCumplimiento: horasRequeridas > 0 ? Math.round((horasAsignadas / horasRequeridas) * 100) : 0,
      };
    });
  }

  // ──────────────────────────────────────────
  // New methods (from esteff branch)
  // ──────────────────────────────────────────

  /**
   * Avance de cursos: % de horas asignadas vs requeridas por oferta
   */
  static async obtenerAvanceCursos(idPeriodo: number) {
    const ofertas = await prisma.curso_oferta.findMany({
      where: { id_periodo: idPeriodo },
      include: {
        curso: true,
        componentes: {
          include: { asignaciones: true },
        },
      },
    });

    return ofertas.map((o) => {
      const horasRequeridas = o.componentes.reduce((s, c) => s + c.horas_requeridas, 0);
      const horasAsignadas = o.componentes.reduce(
        (s, c) => s + c.asignaciones.reduce((s2, a) => s2 + a.horas_asignadas, 0),
        0
      );
      return {
        idOferta: o.id,
        curso: o.curso.nombre,
        codigo: o.curso.codigo,
        horasRequeridas,
        horasAsignadas,
        porcentaje: horasRequeridas > 0 ? Math.round((horasAsignadas / horasRequeridas) * 100) : 0,
      };
    });
  }

  /**
   * KPIs for secretary/director dashboard
   */
  static async obtenerKPIsSecretaria(idPeriodo: number) {
    const [totalDocentes, docentesConBloques, totalOfertas, totalAmbientes, bloquesPeriodo, configs] = await Promise.all([
      prisma.docente.count({ where: { activo: true } }),
      prisma.docente.count({
        where: { activo: true, bloques: { some: { id_periodo: idPeriodo } } },
      }),
      prisma.curso_oferta.count({ where: { id_periodo: idPeriodo } }),
      prisma.ambiente.count({ where: { activo: true } }),
      prisma.bloque_horario.findMany({
        where: { id_periodo: idPeriodo, estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } },
        select: { hora_inicio: true, hora_fin: true },
      }),
      prisma.configuracion.findMany({ where: { id_periodo: idPeriodo } }),
    ]);

    // Calcular ofertas completas (aquellas donde la suma de horas asignadas >= requeridas)
    const ofertas = await prisma.curso_oferta.findMany({
      where: { id_periodo: idPeriodo },
      include: {
        componentes: {
          include: { asignaciones: true },
        },
      },
    });

    const ofertasCompletas = ofertas.filter(o => {
      const requeridas = o.componentes.reduce((s, c) => s + c.horas_requeridas, 0);
      const asignadas = o.componentes.reduce(
        (s, c) => s + c.asignaciones.reduce((s2, a) => s2 + a.horas_asignadas, 0),
        0
      );
      return asignadas >= requeridas && requeridas > 0;
    }).length;

    // Calcular ocupacion de ambientes en horas reales
    const mapaConfig: Record<string, string> = {};
    configs.forEach((c) => (mapaConfig[c.clave] = c.valor));

    const franjaInicio = mapaConfig['FRANJA_INICIO'] || '07:00';
    const franjaFin = mapaConfig['FRANJA_FIN'] || '22:00';
    const almuerzoInicio = mapaConfig['BLOQUEO_ALMUERZO_INICIO'] || '12:00';
    const almuerzoFin = mapaConfig['BLOQUEO_ALMUERZO_FIN'] || '13:00';

    const horasPorDia = duracionHoras(franjaInicio, franjaFin) - duracionHoras(almuerzoInicio, almuerzoFin);
    const horasDisponibles = totalAmbientes * horasPorDia * 5; // 5 días a la semana
    const horasOcupadas = bloquesPeriodo.reduce((sum, b) => sum + duracionHoras(b.hora_inicio, b.hora_fin), 0);

    // Calcular estado de la ventana activa de atencion
    const lp = this.getLimaParts(new Date());
    const ahoraLima = new Date(lp.y, lp.m, lp.d, lp.h, lp.min, 0);

    const ventanas = await prisma.ventana_atencion.findMany({
      where: { id_periodo: idPeriodo },
      orderBy: { fecha: 'asc' },
    });

    let ventanaActiva = null;
    for (const v of ventanas) {
      const vFecha = new Date(v.fecha);
      const y = vFecha.getUTCFullYear();
      const m = vFecha.getUTCMonth();
      const d = vFecha.getUTCDate();
      
      const [hIni, mIni] = v.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = v.hora_fin.split(':').map(Number);
      
      const fechaHoraInicio = new Date(y, m, d, hIni, mIni, 0);
      const fechaHoraFin = new Date(y, m, d, hFin, mFin, 0);

      if (ahoraLima >= fechaHoraInicio && ahoraLima < fechaHoraFin) {
        ventanaActiva = v;
        break;
      }
    }

    let ventanaInfo = null;
    if (ventanaActiva) {
      const vFecha = new Date(ventanaActiva.fecha);
      const y = vFecha.getUTCFullYear();
      const m = vFecha.getUTCMonth();
      const d = vFecha.getUTCDate();
      const [hFin, mFin] = ventanaActiva.hora_fin.split(':').map(Number);
      const fechaHoraFin = new Date(y, m, d, hFin, mFin, 0);

      const msRestantes = fechaHoraFin.getTime() - ahoraLima.getTime();
      const totalMinutosRestantes = Math.max(0, Math.floor(msRestantes / (1000 * 60)));
      
      const dias = Math.floor(totalMinutosRestantes / (24 * 60));
      const horas = Math.floor((totalMinutosRestantes % (24 * 60)) / 60);
      const minutos = totalMinutosRestantes % 60;

      let semaforo = 'VERDE';
      if (totalMinutosRestantes < 4 * 60) {
        semaforo = 'ROJO';
      } else if (totalMinutosRestantes < 24 * 60) {
        semaforo = 'AMARILLO';
      }

      ventanaInfo = {
        id: ventanaActiva.id,
        nombre: ventanaActiva.nombre,
        semaforo,
        tiempoRestante: { dias, horas, minutos },
      };
    }

    // Obtener avance de cursos
    const avanceCursos = await EstadisticasService.obtenerAvanceCursos(idPeriodo);

    return {
      docentes: {
        total: totalDocentes,
        elegidos: docentesConBloques,
      },
      cursos: {
        total: totalOfertas,
        completos: ofertasCompletas,
      },
      ocupacion: {
        horasDisponibles: Math.round(horasDisponibles),
        horasOcupadas: Math.round(horasOcupadas),
      },
      ventana: ventanaInfo,
      avanceCursos,
    };
  }

  /**
   * Summary for a single teacher in a period
   */
  static async obtenerResumenDocente(idDocente: number, idPeriodo: number) {
    // Fetch docente base info + asignaciones
    const docente = await prisma.docente.findUnique({
      where: { id: idDocente },
      select: {
        nombres: true,
        apellidos: true,
        categoria: true,
        modalidad: true,
      },
    });

    if (!docente) throw new Error(`Docente ${idDocente} no encontrado`);

    // Fetch bloques for this period
    const bloques = await prisma.bloque_horario.findMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
      select: { estado: true, hora_inicio: true, hora_fin: true, id_componente: true },
    });

    // Fetch asignaciones
    const asignaciones = await prisma.asignacion_docente_componente.findMany({
      where: { id_docente: idDocente },
      include: {
        componente: {
          include: { oferta: { include: { curso: true } } },
        },
      },
    });

    // Fetch atenciones with ventana in this period
    const atenciones = await prisma.atencion_docente.findMany({
      where: {
        id_docente: idDocente,
        ventana: { id_periodo: idPeriodo },
      },
      include: { ventana: true },
      orderBy: { ventana: { fecha: 'asc' } },
    });

    // Total hours
    const horasRequeridas = asignaciones.reduce((s, a) => s + a.horas_asignadas, 0);
    const horasAsignadas = bloques.reduce(
      (s, b) => s + duracionHoras(b.hora_inicio, b.hora_fin),
      0
    );

    const bloquesConfirmados = bloques.filter((b) =>
      ['CONFIRMADO', 'PUBLICADO'].includes(b.estado)
    ).length;
    const bloquesBorrador = bloques.filter((b) => b.estado === 'BORRADOR').length;

    // Per-component breakdown
    const componentes = asignaciones.map((a) => {
      const bloquesComp = bloques.filter((b) => b.id_componente === a.id_componente);
      const horasComp = bloquesComp.reduce((s, b) => s + duracionHoras(b.hora_inicio, b.hora_fin), 0);
      return {
        idComponente: a.id_componente,
        nombreCurso: (a.componente as any)?.oferta?.curso?.nombre ?? '',
        tipoComponente: (a.componente as any)?.tipo ?? '',
        horasRequeridas: a.horas_asignadas,
        horasAsignadas: horasComp,
        porcentaje: a.horas_asignadas > 0 ? Math.round((horasComp / a.horas_asignadas) * 100) : 0,
      };
    });

    // Next ventana
    const lp2 = this.getLimaParts(new Date());
    const ahoraLimaNext = new Date(lp2.y, lp2.m, lp2.d, lp2.h, lp2.min, 0);

    const proximaAtencion = atenciones.find((at) => {
      if (!at.ventana) return false;
      const vFecha = new Date(at.ventana.fecha);
      const y = vFecha.getUTCFullYear();
      const m = vFecha.getUTCMonth();
      const d = vFecha.getUTCDate();
      const [hFin, mFin] = at.ventana.hora_fin.split(':').map(Number);
      
      const fechaHoraFin = new Date(y, m, d, hFin, mFin, 0);
      return fechaHoraFin >= ahoraLimaNext;
    });

    const proximaVentana = proximaAtencion?.ventana
      ? {
          fecha: proximaAtencion.ventana.fecha,
          horaInicio: proximaAtencion.ventana.hora_inicio,
          horaFin: proximaAtencion.ventana.hora_fin,
          estado: proximaAtencion.estado,
        }
      : null;

    return {
      docente: {
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        categoria: docente.categoria,
        modalidad: docente.modalidad,
      },
      horasRequeridas,
      horasAsignadas,
      porcentaje: horasRequeridas > 0 ? Math.round((horasAsignadas / horasRequeridas) * 100) : 0,
      bloquesConfirmados,
      bloquesBorrador,
      componentes,
      proximaVentana,
    };
  }
}
