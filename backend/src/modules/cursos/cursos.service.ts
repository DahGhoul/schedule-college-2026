import { prisma } from '@/lib/prisma';

export class CursosService {
  /**
   * Listar cursos con búsqueda opcional
   */
  static async listar(buscar?: string) {
    const where: any = {};
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    return prisma.curso.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtener un curso por ID con sus relaciones
   */
  static async obtenerPorId(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      include: {
        grupos: true,
        ambientes: {
          include: {
            ambiente: true,
          },
        },
        docentes: {
          include: {
            docente: true,
          },
        },
      },
    });
  }

  /**
   * Crear un nuevo curso
   */
  static async crear(datos: {
    nombre: string;
    codigo: string;
    horas_teoria: number;
    horas_laboratorio: number;
    creditos: number;
  }) {
    return prisma.curso.create({
      data: {
        nombre: datos.nombre,
        codigo: datos.codigo,
        horas_teoria: datos.horas_teoria,
        horas_laboratorio: datos.horas_laboratorio,
        creditos: datos.creditos,
      },
    });
  }

  /**
   * Actualizar un curso existente
   */
  static async actualizar(id: number, datos: any) {
    return prisma.curso.update({
      where: { id },
      data: datos,
    });
  }

  /**
   * Eliminar un curso (borrado físico)
   */
  static async eliminar(id: number) {
    // Primero eliminar dependencias
    await prisma.curso_ambiente.deleteMany({ where: { id_curso: id } });
    await prisma.docente_curso.deleteMany({ where: { id_curso: id } });
    await prisma.grupo.deleteMany({ where: { id_curso: id } });
    return prisma.curso.delete({ where: { id } });
  }

  /**
   * Buscar cursos por texto (para combos)
   */
  static async buscar(query: string) {
    return prisma.curso.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { codigo: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  // ─── Gestión de ambientes asignados al curso ───

  /**
   * Agregar un ambiente al curso para teoría o laboratorio
   */
  static async agregarAmbiente(idCurso: number, idAmbiente: number, tipoClase: string) {
    // Verificar que no exista ya la misma asignación
    const existente = await prisma.curso_ambiente.findFirst({
      where: {
        id_curso: idCurso,
        id_ambiente: idAmbiente,
        tipo_clase: tipoClase,
      },
    });

    if (existente) {
      throw new Error('El ambiente ya está asignado a este curso para ese tipo de clase');
    }

    return prisma.curso_ambiente.create({
      data: {
        id_curso: idCurso,
        id_ambiente: idAmbiente,
        tipo_clase: tipoClase,
      },
    });
  }

  /**
   * Quitar un ambiente del curso
   */
  static async quitarAmbiente(idCurso: number, idAmbiente: number, tipoClase: string) {
    return prisma.curso_ambiente.deleteMany({
      where: {
        id_curso: idCurso,
        id_ambiente: idAmbiente,
        tipo_clase: tipoClase,
      },
    });
  }

  /**
   * Listar ambientes asignados a un curso
   */
  static async listarAmbientes(idCurso: number) {
    return prisma.curso_ambiente.findMany({
      where: { id_curso: idCurso },
      include: { ambiente: true },
      orderBy: { tipo_clase: 'asc' },
    });
  }

  /**
   * Importar cursos desde un array (útil para carga masiva)
   */
  static async importar(cursos: Array<{
    nombre: string;
    codigo: string;
    horas_teoria: number;
    horas_laboratorio: number;
    creditos: number;
  }>) {
    const resultados = [];
    for (const curso of cursos) {
      const creado = await prisma.curso.upsert({
        where: { codigo: curso.codigo },
        update: curso,
        create: curso,
      });
      resultados.push(creado);
    }
    return resultados;
  }
}