import { prisma } from '@/lib/prisma';
import { DedicacionDocente } from '@prisma/client';
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
    const codigoIbm = typeof datos.codigo_ibm === 'string' && datos.codigo_ibm.trim().length > 0
      ? datos.codigo_ibm.trim()
      : `IBM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const docente = await prisma.docente.create({
      data: {
        codigo_ibm: codigoIbm,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        email: datos.email,
        telefono: datos.telefono,
        modalidad: datos.modalidad,
        categoria: datos.categoria,
        antiguedad: datos.antiguedad ?? 0,
        horas_max_semana: datos.horas_max_semana ?? 40,
      },
    });

    let passwordTemporal: string | null = null;
    if (datos.crear_usuario) {
      passwordTemporal = datos.password || generarPasswordTemporal();
      const hash = await bcrypt.hash(passwordTemporal, 12);
      await prisma.usuario.create({
        data: {
          email: datos.email,
          hash_contrasena: hash,
          rol: 'DOCENTE',
          id_docente: docente.id,
        },
      });
    }

    // Inicializar disponibilidad del docente (horario completo disponible)
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      { inicio: '07:00', fin: '08:00' },
      { inicio: '08:00', fin: '09:00' },
      { inicio: '09:00', fin: '10:00' },
      { inicio: '10:00', fin: '11:00' },
      { inicio: '11:00', fin: '12:00' },
      { inicio: '14:00', fin: '15:00' },
      { inicio: '15:00', fin: '16:00' },
      { inicio: '16:00', fin: '17:00' },
      { inicio: '17:00', fin: '18:00' },
      { inicio: '18:00', fin: '19:00' },
      { inicio: '19:00', fin: '20:00' },
      { inicio: '20:00', fin: '21:00' },
      { inicio: '21:00', fin: '22:00' },
    ];

    for (const dia of dias) {
      for (const hora of horas) {
        await prisma.disponibilidad_docente.create({
          data: {
            id_docente: docente.id,
            dia_semana: dia,
            hora_inicio: hora.inicio,
            hora_fin: hora.fin,
            disponible: true,
          },
        });
      }
    }

    return { ...docente, passwordTemporal };
  }

  static async actualizar(id: number, datos: any) {
    // Filtrar campos que no pertenecen al modelo docente
    const { crear_usuario, password, ...datosLimpios } = datos;
    return prisma.docente.update({ where: { id }, data: datosLimpios });
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