import { prisma } from '@/lib/prisma';
import { ServicioCorreo } from '../notificaciones/servicio-correo';

export class VentanasService {
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

  private static toMinutes(hora: string) {
    const [h, m] = hora.split(':').map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  private static toHora(minutos: number) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private static parseFechaLocal(fechaStr: string) {
    const [y, m, d] = fechaStr.split('-').map(Number);
    // Usamos UTC mediodía para que sea independiente de la zona horaria del servidor
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  private static generarSlots(
    fechaInicio: string,
    fechaFin: string,
    horaInicio: string,
    horaFin: string,
    duracionMinutos: number
  ) {
    const inicio = new Date(`${fechaInicio}T12:00:00Z`);
    const fin = new Date(`${fechaFin}T12:00:00Z`);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw new Error('Fechas invalidas para generar ventanas');
    }
    if (inicio > fin) {
      throw new Error('La fecha de inicio no puede ser mayor a la fecha fin');
    }

    const franjaInicio = this.toMinutes(horaInicio);
    const franjaFin = this.toMinutes(horaFin);

    const slots: Array<{ fecha: Date; hora_inicio: string; hora_fin: string; orden: number }> = [];
    const cursor = new Date(inicio);

    while (cursor <= fin) {
      const diaSemana = cursor.getDay();
      // Permitir de Lunes (1) a Sábado (6). Domingo es 0.
      if (diaSemana !== 0) {
        let orden = 1;
        for (let t = franjaInicio; t + duracionMinutos <= franjaFin; t += duracionMinutos) {
          const hora_inicio = this.toHora(t);
          const hora_fin = this.toHora(t + duracionMinutos);
          slots.push({ fecha: new Date(cursor), hora_inicio, hora_fin, orden });
          orden += 1;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(12, 0, 0, 0); // Mantener mediodía tras incrementar día
    }

    return slots;
  }

  // Configurar ventanas para un período (sobrescribe existentes)
  static async configurar(
    idPeriodo: number,
    dias: Array<{
      fecha: string;
      categorias: Array<{
        categoria: string;
        modalidad: string;
        hora_inicio: string;
        hora_fin: string;
        orden: number;
      }>;
    }>
  ) {
    const existentes = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    const ids = existentes.map((v) => v.id);
    if (ids.length) {
      await prisma.atencion_docente.deleteMany({ where: { id_ventana: { in: ids } } });
      await prisma.ventana_atencion.deleteMany({ where: { id_periodo: idPeriodo } });
    }

    const creadas = [];
    for (const dia of dias) {
      const fechaAjustada = this.parseFechaLocal(dia.fecha);
      for (const slot of dia.categorias) {
        const ventana = await prisma.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: fechaAjustada,
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            categoria: slot.categoria,
            modalidad: slot.modalidad,
            orden: slot.orden,
            estado: 'PENDIENTE',
          },
        });
        creadas.push(ventana);
      }
    }
    return creadas;
  }

  static async generarHorarioAtencion(
    idPeriodo: number,
    fechaInicio: string,
    fechaFin: string,
    horaInicio: string,
    horaFin: string,
    permitirReemplazo = false
  ) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    if (!periodo) throw new Error('Periodo no encontrado');

    if (!permitirReemplazo) {
      const ventanaActiva = await prisma.ventana_atencion.findFirst({
        where: {
          id_periodo: idPeriodo,
          estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
        },
      });
      if (ventanaActiva) {
        throw new Error('Ya existe una ventana activa o pendiente para este periodo');
      }
    }

    const docentes = await prisma.docente.findMany({
      where: {
        activo: true,
        asignaciones: { some: { componente: { oferta: { id_periodo: idPeriodo } } } },
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        modalidad: true,
        categoria: true,
        antiguedad: true,
        email: true,
        usuario: { select: { email: true } },
      },
    });

    if (docentes.length === 0) {
      return { totalDocentes: 0, totalSlots: 0, ventanas: [] };
    }

    const configuracion = await prisma.configuracion.findMany({
      where: {
        id_periodo: idPeriodo,
      },
    });

    const mapaConfig: Record<string, string> = {};

    configuracion.forEach((c) => {
      mapaConfig[c.clave] = c.valor;
    });

    const duracionVentana = parseInt(
      mapaConfig['TIEMPO_ATENCION_VENTANA'] || '30'
    );

    const slots = this.generarSlots(fechaInicio, fechaFin, horaInicio, horaFin, duracionVentana);
    if (slots.length < docentes.length) {
      throw new Error('No hay suficientes slots para cubrir a todos los docentes');
    }

    const ordenModalidad: Record<string, number> = { NOMBRADO: 0, CONTRATADO: 1 };
    const ordenCategoria: Record<string, number> = {
      PRINCIPAL: 0,
      ASOCIADO: 1,
      AUXILIAR: 2,
      JEFE_PRACTICA: 3,
    };

    const docentesOrdenados = [...docentes].sort((a, b) => {
      const mod = (ordenModalidad[a.modalidad] ?? 9) - (ordenModalidad[b.modalidad] ?? 9);
      if (mod !== 0) return mod;
      const cat = (ordenCategoria[a.categoria] ?? 9) - (ordenCategoria[b.categoria] ?? 9);
      if (cat !== 0) return cat;
      if (a.antiguedad !== b.antiguedad) return b.antiguedad - a.antiguedad;
      const apellidos = a.apellidos.localeCompare(b.apellidos);
      if (apellidos !== 0) return apellidos;
      return a.nombres.localeCompare(b.nombres);
    });

    const existentes = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    const ids = existentes.map((v) => v.id);
    if (ids.length) {
      await prisma.atencion_docente.deleteMany({ where: { id_ventana: { in: ids } } });
      await prisma.ventana_atencion.deleteMany({ where: { id_periodo: idPeriodo } });
    }

    const ventanas = await prisma.$transaction(async (tx) => {
      const creadas: any[] = [];
      for (let i = 0; i < docentesOrdenados.length; i++) {
        const docente = docentesOrdenados[i];
        const slot = slots[i];
        const ventana = await tx.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: slot.fecha,
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            categoria: docente.categoria,
            modalidad: docente.modalidad,
            orden: slot.orden,
            estado: 'PENDIENTE',
          },
        });
        await tx.atencion_docente.create({
          data: {
            id_ventana: ventana.id,
            id_docente: docente.id,
            estado: 'PENDIENTE',
            orden_espera: 1,
          },
        });
        creadas.push(ventana);
      }
      return creadas;
    });

    return { totalDocentes: docentesOrdenados.length, totalSlots: slots.length, ventanas };
  }

  static async desactivarVentanas(idPeriodo: number) {
    const ventanas = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    if (ventanas.length === 0) {
      return { mensaje: 'No hay ventanas para desactivar' };
    }

    const ids = ventanas.map((v) => v.id);
    await prisma.$transaction(async (tx) => {
      await tx.atencion_docente.updateMany({
        where: { id_ventana: { in: ids } },
        data: { estado: 'CANCELADO' },
      });
      await tx.ventana_atencion.updateMany({
        where: { id: { in: ids } },
        data: { estado: 'CANCELADO' },
      });
    });

    return { mensaje: 'Ventanas desactivadas correctamente', total: ventanas.length };
  }

  static async enviarCorreosVentanas(idPeriodo: number) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const atenciones = await prisma.atencion_docente.findMany({
      where: {
        ventana: { id_periodo: idPeriodo, estado: { not: 'CANCELADO' } },
      },
      include: {
        ventana: true,
        docente: { include: { usuario: true } },
      },
      orderBy: { ventana: { fecha: 'asc' } },
    });

    if (atenciones.length === 0) {
      return { enviados: 0, errores: 0, mensaje: 'No hay ventanas generadas para este periodo' };
    }

    const periodoNombre = periodo?.nombre ?? String(idPeriodo);

    const resultados = await Promise.all(
      atenciones.map(async (atencion) => {
        const docente = atencion.docente;
        const destinatario = docente.usuario?.email ?? docente.email;
        if (!destinatario) return { ok: false };

        const fecha = atencion.ventana.fecha;
        const y = fecha.getUTCFullYear();
        const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const d = String(fecha.getUTCDate()).padStart(2, '0');
        const fechaStr = `${y}-${m}-${d}`;
        const nombreCompleto = `${docente.nombres} ${docente.apellidos}`;

        const ok = await ServicioCorreo.enviar(
          destinatario,
          `Ventana de atencion asignada - Periodo ${periodoNombre}`,
          `
            <h2>Ventana de atencion asignada</h2>
            <p>Estimado/a <strong>${nombreCompleto}</strong>,</p>
            <p>Se le ha asignado una ventana de atencion para el periodo <strong>${periodoNombre}</strong>.</p>
            <p><strong>Fecha:</strong> ${fechaStr}</p>
            <p><strong>Horario:</strong> ${atencion.ventana.hora_inicio} - ${atencion.ventana.hora_fin}</p>
            <p>Ingrese al sistema en su turno para registrar su horario.</p>
            <br/>
            <p>Atentamente,<br/>Escuela de Ingenieria de Sistemas<br/>Universidad Nacional de Trujillo</p>
          `
        );

        return { ok };
      })
    );

    const enviados = resultados.filter((r) => r.ok).length;
    const errores = resultados.length - enviados;
    return { enviados, errores };
  }

  static async generarAutomaticamente(idPeriodo: number, fechaInicio: string) {
    const categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
    const modalidades = ['NOMBRADO', 'CONTRATADO'];
    
    const existentes = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    if (existentes.length > 0) {
      await prisma.atencion_docente.deleteMany({ where: { id_ventana: { in: existentes.map(v => v.id) } } });
      await prisma.ventana_atencion.deleteMany({ where: { id_periodo: idPeriodo } });
    }

    const configuraciones = await prisma.configuracion.findMany({
      where: {
        id_periodo: idPeriodo,
      },
    });

    const mapaConfig: Record<string, string> = {};

    configuraciones.forEach((c) => {
      mapaConfig[c.clave] = c.valor;
    });

    const duracionVentana = parseInt(
      mapaConfig['TIEMPO_ATENCION_VENTANA'] || '30'
    );    

    let fechaActual = this.parseFechaLocal(fechaInicio);
    let horaActual = 8;
    let minutoActual = 0;
    let ordenGlobal = 1;
    const creadas = [];

    for (const mod of modalidades) {
      for (const cat of categorias) {
        const count = await prisma.docente.count({ where: { modalidad: mod, categoria: cat, activo: true } });
        if (count === 0) continue;

        const h_inicio = `${String(horaActual).padStart(2, '0')}:${String(minutoActual).padStart(2, '0')}`;
        minutoActual += duracionVentana;
        if (minutoActual >= 60) {
          horaActual += 1;
          minutoActual = 0;
        }
        const h_fin = `${String(horaActual).padStart(2, '0')}:${String(minutoActual).padStart(2, '0')}`;

        const ventana = await prisma.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: new Date(fechaActual), // Clonar para que no se modifique la referencia
            hora_inicio: h_inicio,
            hora_fin: h_fin,
            categoria: cat,
            modalidad: mod,
            orden: ordenGlobal++,
            estado: 'PENDIENTE',
          },
        });
        creadas.push(ventana);

        if (horaActual >= 18) {
          fechaActual.setDate(fechaActual.getDate() + 1);
          // Reiniciamos a las 12:00 del día siguiente para mantener consistencia
          fechaActual.setHours(12, 0, 0, 0);
          horaActual = 8;
          minutoActual = 0;
        }
      }
    }
    return creadas;
  }

  static async listar(idPeriodo?: number) {
    const ventanas = await prisma.ventana_atencion.findMany({
      where: {
        ...(idPeriodo ? { id_periodo: idPeriodo } : {}),
        estado: { not: 'CANCELADO' },
      },
      include: {
        atenciones: {
          include: {
            docente: {
              include: {
                bloques: idPeriodo ? { where: { id_periodo: idPeriodo } } : true
              }
            }
          }
        }
      },
      orderBy: [{ fecha: 'asc' }, { orden: 'asc' }],
    });

    // Enriquecer con información de si cargó horario
    return ventanas.map(v => ({
      ...v,
      atenciones: v.atenciones.map(at => ({
        ...at,
        cargoHorario: at.docente.bloques.length > 0
      }))
    }));
  }

  static async actualizarTurno(idVentana: number, idDocente: number, fecha: string, horaInicio: string, horaFin: string) {
    return prisma.$transaction(async (tx) => {
      // Manejar fecha para evitar desfases de zona horaria (usar mediodía local)
      const [y, m, d] = fecha.split('-').map(Number);
      const fechaAjustada = new Date(y, m - 1, d, 12, 0, 0);

      // Actualizar la ventana
      const ventana = await tx.ventana_atencion.update({
        where: { id: idVentana },
        data: {
          fecha: fechaAjustada,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado: 'PENDIENTE'
        }
      });

      // Asegurar que el estado de la atención sea PENDIENTE
      await tx.atencion_docente.update({
        where: {
          id_ventana_id_docente: {
            id_ventana: idVentana,
            id_docente: idDocente
          }
        },
        data: {
          estado: 'PENDIENTE'
        }
      });

      return ventana;
    });
  }

  static async desactivarTurno(idVentana: number, idDocente: number) {
    return prisma.$transaction(async (tx) => {
      // Cancelar la atención del docente
      await tx.atencion_docente.update({
        where: {
          id_ventana_id_docente: {
            id_ventana: idVentana,
            id_docente: idDocente
          }
        },
        data: { estado: 'CANCELADO' }
      });

      // También cancelar la ventana si solo tiene esta atención
      // (o simplemente cancelarla siempre si el sistema es 1:1)
      const ventana = await tx.ventana_atencion.update({
        where: { id: idVentana },
        data: { estado: 'CANCELADO' }
      });

      return ventana;
    });
  }

  static async obtenerActiva(idPeriodo?: number) {
    return prisma.ventana_atencion.findFirst({
      where: {
        ...(idPeriodo && { id_periodo: idPeriodo }),
        estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
      },
      orderBy: [{ fecha: 'asc' }, { orden: 'asc' }],
      include: { atenciones: { include: { docente: true } } },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.ventana_atencion.findUnique({
      where: { id },
      include: { atenciones: { include: { docente: true } } },
    });
  }

  static async iniciarVentana(id: number) {
    return prisma.ventana_atencion.update({
      where: { id },
      data: { estado: 'EN_PROCESO' },
    });
  }

  static async obtenerCola(id: number) {
    return prisma.atencion_docente.findMany({
      where: { id_ventana: id },
      include: { docente: true },
      orderBy: { orden_espera: 'asc' },
    });
  }

  static async siguienteDocente(id: number) {
    const siguiente = await prisma.atencion_docente.findFirst({
      where: { id_ventana: id, estado: 'PENDIENTE' },
      include: { docente: true },
      orderBy: { orden_espera: 'asc' },
    });

    if (siguiente) {
      await prisma.atencion_docente.update({
        where: { id: siguiente.id },
        data: { estado: 'EN_PROCESO' },
      });
    }
    return siguiente;
  }

  static async marcarAtendido(idVentana: number, idDocente: number) {
    return prisma.atencion_docente.update({
      where: {
        id_ventana_id_docente: {
          id_ventana: idVentana,
          id_docente: idDocente,
        },
      },
      data: { estado: 'COMPLETADO' },
    });
  }

  /**
   * Variante B: verifica si el docente tiene acceso en base a fecha/hora actual.
   * Retorna:
   *   { acceso: true, ventana, atencion }  → puede seleccionar celdas
   *   { acceso: false, razon, proximaVentana? } → no puede seleccionar celdas
   */
  static async obtenerTurnoDocente(idDocente: number, idPeriodo: number) {
    // ¿Existe alguna ventana configurada para este periodo?
    const totalVentanas = await prisma.ventana_atencion.count({
      where: { id_periodo: idPeriodo, estado: { not: 'CANCELADO' } },
    });

    if (totalVentanas === 0) {
      // Sin ventanas configuradas → bloqueado (nuevo requerimiento)
      return { acceso: false, razon: 'SIN_CONFIGURACION' };
    }

    // Buscar la atención asignada a este docente en este periodo
    const atencionDocente = await prisma.atencion_docente.findFirst({
      where: {
        id_docente: idDocente,
        ventana: { id_periodo: idPeriodo, estado: { not: 'CANCELADO' } },
      },
      include: {
        ventana: true,
      },
      orderBy: { ventana: { fecha: 'asc' } },
    });

    if (!atencionDocente) {
      return { acceso: false, razon: 'SIN_ASIGNACION' };
    }

    if (atencionDocente.estado === 'CANCELADO') {
      return { acceso: false, razon: 'CANCELADO' };
    }

    // Comparar fecha y hora actual con la ventana asignada
    // Obtenemos la fecha y hora actual en Lima usando el helper para máxima robustez
    const lp = this.getLimaParts(new Date());
    const ahoraLima = new Date(lp.y, lp.m, lp.d, lp.h, lp.min, 0);

    const ventana = atencionDocente.ventana;
    const vFecha = new Date(ventana.fecha);
    // Usamos los componentes UTC de la fecha guardada (que está a mediodía UTC)
    const y = vFecha.getUTCFullYear();
    const m = vFecha.getUTCMonth();
    const d = vFecha.getUTCDate();

    const [hIni, mIni] = ventana.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = ventana.hora_fin.split(':').map(Number);

    // Creamos los límites de la ventana en el mismo "espacio local" para comparar
    const fechaHoraInicio = new Date(y, m, d, hIni, mIni, 0);
    const fechaHoraFin = new Date(y, m, d, hFin, mFin, 0);

    const fechaStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (ahoraLima < fechaHoraInicio) {
      return {
        acceso: false,
        razon: 'AUN_NO_ES_SU_TURNO',
        turnoAsignado: {
          fecha: fechaStr,
          horaInicio: ventana.hora_inicio,
          horaFin: ventana.hora_fin,
          orden: ventana.orden,
        },
      };
    }

    if (ahoraLima > fechaHoraFin) {
      return {
        acceso: false,
        razon: 'TURNO_VENCIDO',
        turnoAsignado: {
          fecha: fechaStr,
          horaInicio: ventana.hora_inicio,
          horaFin: ventana.hora_fin,
        },
      };
    }

    // El docente está dentro de su ventana de tiempo → acceso permitido
    return {
      acceso: true,
      razon: 'EN_TURNO',
      turnoAsignado: {
        fecha: fechaStr,
        horaInicio: ventana.hora_inicio,
        horaFin: ventana.hora_fin,
        orden: ventana.orden,
      },
    };
  }
}
