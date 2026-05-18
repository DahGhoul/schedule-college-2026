import { prisma } from '@/lib/prisma';

export class GruposService {
  /**
   * Listar todos los grupos
   */
  static async listar() {
    return prisma.grupo.findMany({
      where: { activo: true },
      include: {
        curso: true,
      },
      orderBy: [{ curso: { nombre: 'asc' } }, { codigo_grupo: 'asc' }],
    });
  }

  /**
   * Obtener un grupo por ID
   */
  static async obtenerPorId(id: number) {
    return prisma.grupo.findUnique({
      where: { id },
      include: {
        curso: true,
        horarios: {
          include: {
            docente: true,
            ambiente: true,
          },
        },
      },
    });
  }

  /**
   * Listar grupos de un curso específico
   */
  static async listarPorCurso(idCurso: number) {
    return prisma.grupo.findMany({
      where: { id_curso: idCurso },
      orderBy: { codigo_grupo: 'asc' },
    });
  }

  /**
   * Crear un nuevo grupo para un curso
   */
  static async crear(datos: {
    id_curso: number;
    codigo_grupo: string;
    capacidad_maxima: number;
  }) {
    // Verificar que el curso existe
    const curso = await prisma.curso.findUnique({ where: { id: datos.id_curso } });
    if (!curso) throw new Error('Curso no encontrado');

    // Verificar que no exista otro grupo con el mismo código en el mismo curso
    const existente = await prisma.grupo.findFirst({
      where: {
        id_curso: datos.id_curso,
        codigo_grupo: datos.codigo_grupo,
      },
    });

    if (existente) {
      throw new Error('Ya existe un grupo con ese código en este curso');
    }

    return prisma.grupo.create({
      data: {
        id_curso: datos.id_curso,
        codigo_grupo: datos.codigo_grupo,
        capacidad_maxima: datos.capacidad_maxima,
      },
    });
  }

  /**
   * Crear múltiples grupos para un curso: se puede pasar `codigos` explícitos
   * o `cantidad` para generar códigos consecutivos (A, B, C, ...).
   */
  static async crearMultiplesPorCurso(idCurso: number, datos: { cantidad?: number; codigos?: string[]; capacidad_maxima?: number }) {
    const curso = await prisma.curso.findUnique({ where: { id: idCurso } });
    if (!curso) throw new Error('Curso no encontrado');

    const cantidad = datos.cantidad && datos.cantidad > 0 ? datos.cantidad : 1;
    const existentes = await prisma.grupo.findMany({
      where: { id_curso: idCurso },
      select: { codigo_grupo: true },
    });

    const existentesSet = new Set(existentes.map((g) => g.codigo_grupo.toUpperCase()));
    const genCodigo = (index: number) => {
      let num = index;
      let str = '';
      do {
        str = String.fromCharCode(65 + (num % 26)) + str;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      return str;
    };

    const codes: string[] = [];
    let i = 0;
    while (codes.length < cantidad) {
      const codigo = genCodigo(i);
      if (!existentesSet.has(codigo)) {
        codes.push(codigo);
        existentesSet.add(codigo);
      }
      i += 1;
    }

    const creados = [] as any[];
    const saltados: string[] = [];

    for (const codigo of codes) {
      const existente = await prisma.grupo.findFirst({ where: { id_curso: idCurso, codigo_grupo: codigo } });
      if (existente) {
        saltados.push(codigo);
        continue;
      }

      const creado = await prisma.grupo.create({
        data: {
          id_curso: idCurso,
          codigo_grupo: codigo,
          capacidad_maxima: datos.capacidad_maxima ?? 40,
        },
      });
      creados.push(creado);
    }

    return { creados, saltados };
  }

  /**
   * Actualizar un grupo existente
   */
  static async actualizar(id: number, datos: { codigo_grupo?: string; capacidad_maxima?: number }) {
    // Si se cambia el código, verificar que no exista duplicado
    if (datos.codigo_grupo) {
      const grupo = await prisma.grupo.findUnique({ where: { id } });
      if (!grupo) throw new Error('Grupo no encontrado');

      const existente = await prisma.grupo.findFirst({
        where: {
          id_curso: grupo.id_curso,
          codigo_grupo: datos.codigo_grupo,
          NOT: { id },
        },
      });

      if (existente) {
        throw new Error('Ya existe otro grupo con ese código en este curso');
      }
    }

    return prisma.grupo.update({
      where: { id },
      data: datos,
    });
  }

  /**
   * Desactivar un grupo (borrado lógico)
   */
  static async eliminar(id: number) {
    return prisma.grupo.update({ where: { id }, data: { activo: false } });
  }

  /**
   * Reactivar un grupo
   */
  static async reactivar(id: number) {
    return prisma.grupo.update({ where: { id }, data: { activo: true } });
  }

  /**
   * Obtener grupos con su ocupación actual
   */
  static async obtenerOcupacion(idPeriodo?: number) {
    const grupos = await prisma.grupo.findMany({
      include: {
        curso: true,
        horarios: {
          where: idPeriodo
            ? { id_periodo: idPeriodo, estado: { in: ['CONFIRMADO', 'PUBLICADO'] } }
            : { estado: { in: ['CONFIRMADO', 'PUBLICADO'] } },
          select: { id: true },
        },
      },
    });

    return grupos.map((grupo) => ({
      ...grupo,
      horarios_asignados: grupo.horarios.length,
      porcentaje_ocupacion: grupo.capacidad_maxima > 0
        ? Math.round((grupo.horarios.length / grupo.capacidad_maxima) * 100)
        : 0,
    }));
  }
}