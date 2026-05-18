import { prisma } from '@/lib/prisma';

export class DisponibilidadService {
  static async obtenerPorDocente(idDocente: number) {
    return prisma.disponibilidad_docente.findMany({
      where: { id_docente: idDocente },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  static async actualizar(idDisponibilidad: number, disponible: boolean) {
    return prisma.disponibilidad_docente.update({
      where: { id: idDisponibilidad },
      data: { disponible },
    });
  }

  static async actualizarBatch(idDocente: number, disponibilidades: { id: number; disponible: boolean }[]) {
    const resultados = [];
    for (const disp of disponibilidades) {
      resultados.push(
        await prisma.disponibilidad_docente.update({
          where: { id: disp.id, id_docente: idDocente },
          data: { disponible: disp.disponible },
        })
      );
    }
    return resultados;
  }
}
