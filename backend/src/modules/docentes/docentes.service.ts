import { prisma } from '@/lib/prisma';
import {
  DedicacionDocente,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

// Función para generar una contraseña temporal aleatoria
const generarPasswordTemporal = (longitud: number = 8): string => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < longitud; i++) {
    password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return password;
};

export class DocentesService {
  static async listar(params: { modalidad?: string; categoria?: string; buscar?: string }) {
    const where: any = { activo: true };
    if (params.modalidad) where.modalidad = params.modalidad;
    if (params.categoria) where.categoria = params.categoria;
    if (params.buscar) {
      where.OR = [
        { nombres: { contains: params.buscar, mode: 'insensitive' } },
        { apellidos: { contains: params.buscar, mode: 'insensitive' } },
        { email: { contains: params.buscar, mode: 'insensitive' } },
      ];
    }
    return prisma.docente.findMany({ where, orderBy: [{ modalidad: 'asc' }, { categoria: 'asc' }, { antiguedad: 'desc' }] });
  }

  static async obtenerPorId(id: number) {
    return prisma.docente.findUnique({ where: { id }, include: { usuario: true } });
  }

  static async crear(datos: any) {
    const normalizarTexto = (valor?: string | null) => {
      if (!valor) return null;

      const limpio = valor.trim();

      return limpio.length > 0 ? limpio : null;
    };

    const codigoIbm =
      normalizarTexto(datos.codigo_ibm) ??
      `IBM-${Date.now()}`;

    const data: Prisma.docenteCreateInput = {
      codigo_ibm: codigoIbm,

      dni: normalizarTexto(datos.dni),

      nombres: datos.nombres.trim(),

      apellidos: datos.apellidos.trim(),

      email: datos.email.trim().toLowerCase(),

      empleo: normalizarTexto(datos.empleo),

      telefono: normalizarTexto(datos.telefono),

      modalidad: datos.modalidad,

      categoria: datos.categoria,

      dedicacion:
        (datos.dedicacion as DedicacionDocente) ??
        DedicacionDocente.TIEMPO_COMPLETO_40H,

      antiguedad: datos.antiguedad ?? 0,

      horas_max_semana:
        datos.horas_max_semana ?? 40,

      activo: true,
    };

    // Relación sede
    if (datos.id_sede_principal) {
      data.sede_principal = {
        connect: {
          id: Number(datos.id_sede_principal),
        },
      };
    }

    const docente = await prisma.docente.create({
      data,
    });

    let passwordTemporal: string | null = null;

    if (datos.crear_usuario) {
      passwordTemporal =
        datos.password ||
        generarPasswordTemporal();

      const hash = await bcrypt.hash(
        passwordTemporal,
        12
      );

      await prisma.usuario.create({
        data: {
          email: docente.email,
          hash_contrasena: hash,
          rol: 'DOCENTE',
          id_docente: docente.id,
        },
      });
    }

    // Disponibilidad inicial
    const dias = [
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
    ];

    const horas = [
      ['07:00', '08:00'],
      ['08:00', '09:00'],
      ['09:00', '10:00'],
      ['10:00', '11:00'],
      ['11:00', '12:00'],
      ['14:00', '15:00'],
      ['15:00', '16:00'],
      ['16:00', '17:00'],
      ['17:00', '18:00'],
      ['18:00', '19:00'],
      ['19:00', '20:00'],
      ['20:00', '21:00'],
      ['21:00', '22:00'],
    ];

    await prisma.disponibilidad_docente.createMany({
      data: dias.flatMap((dia) =>
        horas.map(([inicio, fin]) => ({
          id_docente: docente.id,
          dia_semana: dia,
          hora_inicio: inicio,
          hora_fin: fin,
          disponible: true,
        }))
      ),
    });

    return {
      ...docente,
      passwordTemporal,
    };
  }

  static async actualizar(id: number, datos: any) {
    const {
      crear_usuario,
      password,
      ...resto
    } = datos;

    return prisma.docente.update({
      where: { id },
      data: {
        ...resto,

        dedicacion: resto.dedicacion
          ? (resto.dedicacion as DedicacionDocente)
          : undefined,
      },
    });
  }

  static async eliminar(id: number) {
    return prisma.docente.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.docente.update({ where: { id }, data: { activo: true } });
  }

  static async buscar(query: string) {
    return prisma.docente.findMany({
      where: {
        OR: [
          { nombres: { contains: query, mode: 'insensitive' } },
          { apellidos: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  static async porCategoria(categoria: string, modalidad: string) {
    return prisma.docente.findMany({
      where: { categoria, modalidad },
      orderBy: { antiguedad: 'desc' },
    });
  }

  static async obtenerDisponibilidad(idDocente: number) {
    return prisma.disponibilidad_docente.findMany({
      where: { id_docente: idDocente },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  static async guardarDisponibilidad(
    idDocente: number,
    disponibilidad: Array<{
      diaSemana: string;
      horaInicio: string;
      horaFin: string;
      disponible: boolean;
    }>
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.disponibilidad_docente.deleteMany({ where: { id_docente: idDocente } });
      if (disponibilidad.length > 0) {
        await tx.disponibilidad_docente.createMany({
          data: disponibilidad.map((item) => ({
            id_docente: idDocente,
            dia_semana: item.diaSemana,
            hora_inicio: item.horaInicio,
            hora_fin: item.horaFin,
            disponible: item.disponible,
          })),
        });
      }
    });

    return this.obtenerDisponibilidad(idDocente);
  }
}