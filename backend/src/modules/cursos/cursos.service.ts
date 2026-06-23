import { prisma } from '@/lib/prisma';

export class CursosService {
  /**
   * Listar cursos con búsqueda y filtro por currícula
   */
  static async listar(buscar?: string, idCurricula?: number | null) {
    const where: any = { activo: true };

    if (idCurricula === 0) {
      where.id_curricula = null;
    } else if (idCurricula && idCurricula > 0) {
      where.id_curricula = idCurricula;
    } else {
      const vigente = await prisma.curricula.findFirst({ where: { vigente: true, activo: true } });
      if (vigente) {
        where.id_curricula = vigente.id;
      }
    }

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    return prisma.curso.findMany({
      where,
      include: {
        curricula: true,
      },
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
        curricula: true,
        ofertas: {
          include: {
            periodo: true,
            ciclo: true,
            componentes: {
              include: {
                grupos: true,
                asignaciones: { include: { docente: true } },
                bloques: true,
              },
            },
          },
          orderBy: [{ id_periodo: 'desc' }, { id_ciclo: 'asc' }],
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
    creditos: number;
    id_curricula?: number | null;
  }) {
    return prisma.curso.create({
      data: {
        nombre: datos.nombre,
        codigo: datos.codigo,
        creditos: datos.creditos,
        id_curricula: datos.id_curricula ?? null,
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
   * Desactivar un curso (borrado lógico)
   */
  static async eliminar(id: number) {
    return prisma.curso.update({ where: { id }, data: { activo: false } });
  }

  /**
   * Reactivar un curso
   */
  static async reactivar(id: number) {
    return prisma.curso.update({ where: { id }, data: { activo: true } });
  }

  /**
   * Buscar cursos por texto (para combos)
   */
  static async buscar(query: string) {
    return prisma.curso.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { codigo: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  /**
   * Importar cursos desde un array (útil para carga masiva)
   */
  static async importar(cursos: Array<{
    nombre: string;
    codigo: string;
    creditos: number;
  }>) {
    const resultados = [];
    for (const curso of cursos) {
      const creado = await prisma.curso.upsert({
        where: { codigo: curso.codigo },
        update: { nombre: curso.nombre, creditos: curso.creditos, activo: true },
        create: { nombre: curso.nombre, codigo: curso.codigo, creditos: curso.creditos },
      });
      resultados.push(creado);
    }
    return resultados;
  }
}
