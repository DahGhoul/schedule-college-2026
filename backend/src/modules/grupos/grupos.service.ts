import { prisma } from '@/lib/prisma';

export class GruposService {
  /**
   * Listar todos los grupos
   */
  static async listar() {
    return prisma.grupo.findMany({
      where: { activo: true },
      include: {
        componente: {
          include: {
            oferta: { include: { curso: true, periodo: true, ciclo: true } },
          },
        },
      },
      orderBy: [{ componente: { oferta: { curso: { nombre: 'asc' } } } }, { codigo: 'asc' }],
    });
  }

  /**
   * Obtener un grupo por ID
   */
  static async obtenerPorId(id: number) {
    return prisma.grupo.findUnique({
      where: { id },
      include: {
        componente: {
          include: { oferta: { include: { curso: true, periodo: true, ciclo: true } } },
        },
        bloques: {
          include: {
            docente: true,
            ambiente: true,
          },
        },
      },
    });
  }

  /**
   * Listar grupos de un componente específico
   */
  static async listarPorComponente(idComponente: number) {
    return prisma.grupo.findMany({
      where: { id_componente: idComponente, activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  /**
   * Crear un nuevo grupo para un componente
   */
  static async crear(datos: {
    id_componente: number;
    codigo: string;
    capacidad_maxima: number;
  }) {
    const componente = await prisma.curso_componente.findUnique({ where: { id: datos.id_componente } });
    if (!componente) throw new Error('Componente no encontrado');

    // Verificar que no exista otro grupo con el mismo código en el mismo componente
    const existente = await prisma.grupo.findFirst({
      where: {
        id_componente: datos.id_componente,
        codigo: datos.codigo,
      },
    });

    if (existente) {
      throw new Error('Ya existe un grupo con ese código en este componente');
    }

    return prisma.grupo.create({
      data: {
        id_componente: datos.id_componente,
        codigo: datos.codigo,
        capacidad_maxima: datos.capacidad_maxima,
      },
    });
  }

  /**
   * Crear múltiples grupos para un componente.
   * o `cantidad` para generar códigos consecutivos (A, B, C, ...).
   */
  static async crearMultiplesPorComponente(idComponente: number, datos: { cantidad?: number; codigos?: string[]; capacidad_maxima?: number }) {
    const componente = await prisma.curso_componente.findUnique({ where: { id: idComponente } });
    if (!componente) throw new Error('Componente no encontrado');

    const cantidad = datos.cantidad && datos.cantidad > 0 ? datos.cantidad : 1;
    const existentes = await prisma.grupo.findMany({
      where: { id_componente: idComponente },
      select: { codigo: true },
    });

    const existentesSet = new Set(existentes.map((g) => g.codigo.toUpperCase()));
    const genCodigo = (index: number) => {
      let num = index;
      let str = '';
      do {
        str = String.fromCharCode(65 + (num % 26)) + str;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      return str;
    };

    const codes: string[] =
      datos.codigos && datos.codigos.length > 0
        ? datos.codigos.map((c) => c.toUpperCase())
        : (() => {
            const generados: string[] = [];
            let i = 0;
            while (generados.length < cantidad) {
              const codigo = genCodigo(i);
              if (!existentesSet.has(codigo)) {
                generados.push(codigo);
                existentesSet.add(codigo);
              }
              i += 1;
            }
            return generados;
          })();

    const creados = [] as any[];
    const saltados: string[] = [];

    for (const codigo of codes) {
      const existente = await prisma.grupo.findFirst({ where: { id_componente: idComponente, codigo } });
      if (existente) {
        saltados.push(codigo);
        continue;
      }

      const creado = await prisma.grupo.create({
        data: {
          id_componente: idComponente,
          codigo,
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
  static async actualizar(id: number, datos: { codigo?: string; capacidad_maxima?: number }) {
    // Si se cambia el código, verificar que no exista duplicado
    if (datos.codigo) {
      const grupo = await prisma.grupo.findUnique({ where: { id } });
      if (!grupo) throw new Error('Grupo no encontrado');

      const existente = await prisma.grupo.findFirst({
        where: {
          id_componente: grupo.id_componente,
          codigo: datos.codigo,
          NOT: { id },
        },
      });

      if (existente) {
        throw new Error('Ya existe otro grupo con ese código en este componente');
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
        componente: {
          include: { oferta: { include: { curso: true } } },
        },
        bloques: {
          where: idPeriodo
            ? { id_periodo: idPeriodo, estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } }
            : { estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } },
          select: { id: true },
        },
      },
    });

    return grupos.map((grupo) => ({
      ...grupo,
      horarios_asignados: grupo.bloques.length,
      porcentaje_ocupacion: grupo.capacidad_maxima > 0
        ? Math.round((grupo.bloques.length / grupo.capacidad_maxima) * 100)
        : 0,
    }));
  }
}
