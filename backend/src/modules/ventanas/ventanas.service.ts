import { prisma } from '@/lib/prisma';

export class VentanasService {
  private static toMinutes(hora: string) {
    const [h, m] = hora.split(':').map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  private static toHora(minutos: number) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private static generarSlots(
    fechaInicio: string,
    fechaFin: string,
    horaInicio: string,
    horaFin: string
  ) {
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw new Error('Fechas invalidas para generar ventanas');
    }
    if (inicio > fin) {
      throw new Error('La fecha de inicio no puede ser mayor a la fecha fin');
    }

    if (this.toMinutes(horaInicio) >= this.toMinutes(horaFin)) {
      throw new Error('La hora de inicio debe ser menor a la hora de fin');
    }

    const franjaInicio = this.toMinutes(horaInicio);
    const franjaFin = this.toMinutes(horaFin);

    const slots: Array<{ fecha: Date; hora_inicio: string; hora_fin: string; orden: number }> = [];
    const cursor = new Date(inicio);

    while (cursor <= fin) {
      const diaSemana = cursor.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        let orden = 1;
        for (let t = franjaInicio; t + 30 <= franjaFin; t += 30) {
          const hora_inicio = this.toHora(t);
          const hora_fin = this.toHora(t + 30);
          slots.push({ fecha: new Date(cursor), hora_inicio, hora_fin, orden });
          orden += 1;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
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
      for (const slot of dia.categorias) {
        const ventana = await prisma.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: new Date(dia.fecha),
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
      },
    });

    if (docentes.length === 0) {
      return { totalDocentes: 0, totalSlots: 0, ventanas: [] };
    }

    const slots = this.generarSlots(fechaInicio, fechaFin, horaInicio, horaFin);
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

  static async generarAutomaticamente(idPeriodo: number, fechaInicio: string) {
    const categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
    const modalidades = ['NOMBRADO', 'CONTRATADO'];
    
    const existentes = await prisma.ventana_atencion.findMany({ where: { id_periodo: idPeriodo } });
    if (existentes.length > 0) {
      await prisma.atencion_docente.deleteMany({ where: { id_ventana: { in: existentes.map(v => v.id) } } });
      await prisma.ventana_atencion.deleteMany({ where: { id_periodo: idPeriodo } });
    }

    let fechaActual = new Date(fechaInicio);
    let horaActual = 8;
    let minutoActual = 0;
    let ordenGlobal = 1;
    const creadas = [];

    for (const mod of modalidades) {
      for (const cat of categorias) {
        const count = await prisma.docente.count({ where: { modalidad: mod, categoria: cat, activo: true } });
        if (count === 0) continue;

        const h_inicio = `${String(horaActual).padStart(2, '0')}:${String(minutoActual).padStart(2, '0')}`;
        minutoActual += 30;
        if (minutoActual >= 60) {
          horaActual += 1;
          minutoActual = 0;
        }
        const h_fin = `${String(horaActual).padStart(2, '0')}:${String(minutoActual).padStart(2, '0')}`;

        const ventana = await prisma.ventana_atencion.create({
          data: {
            id_periodo: idPeriodo,
            fecha: fechaActual,
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
          horaActual = 8;
          minutoActual = 0;
        }
      }
    }
    return creadas;
  }

  static async listar(idPeriodo?: number) {
    return prisma.ventana_atencion.findMany({
      where: idPeriodo ? { id_periodo: idPeriodo } : {},
      include: { atenciones: { include: { docente: true } } },
      orderBy: [{ fecha: 'asc' }, { orden: 'asc' }],
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
}
