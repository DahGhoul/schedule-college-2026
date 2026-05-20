import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { MatrizDisponibilidad, DisponibilidadCelda, SeleccionTemporal } from './horarios.types';
import { obtenerClavesPorPatron } from './redis-claves';
import { GestorSeleccionTemporal } from './gestor-seleccion-temporal.service';

export class GestorDisponibilidad {
  /**
   * Construye la matriz de disponibilidad para un ambiente en un período
   */
  static async construirMatriz(
    idAmbiente: number,
    idPeriodo: number,
    idDocente?: number
  ): Promise<MatrizDisponibilidad> {
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    if (!ambiente) throw new Error('Ambiente no encontrado');

    // Obtener restricciones
    const configs = await prisma.configuracion.findMany({
      where: { id_periodo: idPeriodo },
    });
    const mapaConfig: Record<string, string> = {};
    configs.forEach((c) => (mapaConfig[c.clave] = c.valor));

    const franjaInicio = mapaConfig['FRANJA_INICIO'] || '07:00';
    const franjaFin = mapaConfig['FRANJA_FIN'] || '22:00';
    const almuerzoInicio = mapaConfig['BLOQUEO_ALMUERZO_INICIO'] || '12:00';
    const almuerzoFin = mapaConfig['BLOQUEO_ALMUERZO_FIN'] || '13:00';

    // 1. Horarios asignados al ambiente actual
    const horariosAsignadosAmbiente = await prisma.bloque_horario.findMany({
      where: {
        id_ambiente: idAmbiente,
        id_periodo: idPeriodo,
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
      },
      include: {
        docente: true,
        ambiente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        grupo: true,
      },
    });

    // 2. Horarios del docente actual (en cualquier ambiente)
    const horariosDocente = idDocente
      ? await prisma.bloque_horario.findMany({
          where: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: {
            docente: true,
            ambiente: true,
            componente: { include: { oferta: { include: { curso: true } } } },
            grupo: true,
          },
        })
      : [];

    // 3. Selecciones temporales en el ambiente actual
    const clavesTemporalesAmbiente = await obtenerClavesPorPatron(`seleccion_temporal:${idAmbiente}:*`);
    const seleccionesTemporalesAmbiente: SeleccionTemporal[] = [];
    for (const clave of clavesTemporalesAmbiente) {
      const valor = await redis.get(clave);
      if (valor) seleccionesTemporalesAmbiente.push(JSON.parse(valor));
    }

    // 4. Selecciones temporales del docente actual (en cualquier ambiente)
    const seleccionesTemporalesDocenteRaw = idDocente
      ? await GestorSeleccionTemporal.obtenerSeleccionesDocente(idDocente)
      : [];

    const seleccionesTemporalesDocente = await Promise.all(
      seleccionesTemporalesDocenteRaw.map(async (sel) => {
        const [comp, grp, amb] = await Promise.all([
          prisma.curso_componente.findUnique({
            where: { id: sel.idComponente },
            include: { oferta: { include: { curso: true } } },
          }),
          prisma.grupo.findUnique({ where: { id: sel.idGrupo } }),
          sel.idAmbiente ? prisma.ambiente.findUnique({ where: { id: sel.idAmbiente } }) : Promise.resolve(null),
        ]);
        return {
          ...sel,
          nombreCurso: comp?.oferta?.curso?.nombre || '',
          tipoComponente: comp?.tipo || '',
          codigoGrupo: grp?.codigo || '',
          codigoAmbiente: amb?.codigo || '',
        };
      })
    );

    // Obtener mantenimientos activos
    const mantenimientos = await prisma.mantenimiento.findMany({
      where: {
        id_ambiente: idAmbiente,
        fecha_inicio: { lte: new Date() },
        fecha_fin: { gte: new Date() },
      },
    });

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = this.generarFranjasHorarias(franjaInicio, franjaFin);

    const filas = horas.map((hora) => {
      const celdas: DisponibilidadCelda[] = dias.map((dia) => {
        // Bloqueo institucional de almuerzo
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          return { diaSemana: dia, horaInicio: hora, estado: 'BLOQUEO_INSTITUCIONAL' };
        }
        // Mantenimiento
        if (mantenimientos.length > 0) {
          return { diaSemana: dia, horaInicio: hora, estado: 'OCUPADO', info: { detalle: 'Mantenimiento de ambiente' } };
        }

        // B. ¿Tiene el docente actual alguna clase o selección temporal propia en este horario?
        // B1. Buscar en bloques de BD del docente
        const bloqueDocenteBD = horariosDocente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueDocenteBD) {
          const esAqui = bloqueDocenteBD.id_ambiente === idAmbiente;
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: esAqui ? 'SELECCION_TEMPORAL' : 'DOCENTE_OTRO_AMBIENTE',
            info: {
              idAmbiente: bloqueDocenteBD.id_ambiente || undefined,
              ambienteCodigo: bloqueDocenteBD.ambiente?.codigo || 'Pendiente',
              curso: bloqueDocenteBD.componente.oferta.curso.nombre,
              tipoComponente: bloqueDocenteBD.componente.tipo,
              grupo: bloqueDocenteBD.grupo.codigo,
              confirmado: true,
              estadoBloque: bloqueDocenteBD.estado,
            },
          };
        }

        // B2. Buscar en selecciones temporales del docente (Redis)
        const temporalDocente = seleccionesTemporalesDocente.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora
        );
        if (temporalDocente) {
          const esAqui = temporalDocente.idAmbiente === idAmbiente;
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: esAqui ? 'SELECCION_TEMPORAL' : 'DOCENTE_OTRO_AMBIENTE',
            info: {
              idAmbiente: temporalDocente.idAmbiente || undefined,
              ambienteCodigo: temporalDocente.codigoAmbiente || 'Pendiente',
              curso: temporalDocente.nombreCurso,
              tipoComponente: temporalDocente.tipoComponente,
              grupo: temporalDocente.codigoGrupo,
              confirmado: false,
              estadoBloque: 'TEMPORAL',
            },
          };
        }

        // C. ¿Está ocupado el ambiente actual por OTRO docente?
        // C1. Bloques en la BD en el ambiente actual
        const bloqueAmbienteBD = horariosAsignadosAmbiente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueAmbienteBD) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: `Ocupado por ${bloqueAmbienteBD.componente.oferta.curso.nombre} (${bloqueAmbienteBD.docente?.nombres} ${bloqueAmbienteBD.docente?.apellidos})`,
            },
          };
        }

        // C2. Selecciones temporales en Redis para este ambiente
        const temporalAmbiente = seleccionesTemporalesAmbiente.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora
        );
        if (temporalAmbiente) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: 'Ocupado temporalmente por otro docente',
            },
          };
        }

        // D. Celda libre
        return { diaSemana: dia, horaInicio: hora, estado: 'LIBRE' };
      });
      return { horaInicio: hora, celdas };
    });

    return {
      ambienteId: idAmbiente,
      ambienteCodigo: ambiente.codigo,
      filas,
    };
  }

  /**
   * Genera las franjas horarias desde inicio hasta fin (cada 1 hora)
   */
  static generarFranjasHorarias(inicio: string, fin: string): string[] {
    const franjas: string[] = [];
    let [horaInicio] = inicio.split(':').map(Number);
    const [horaFin] = fin.split(':').map(Number);
    while (horaInicio < horaFin) {
      const hh = horaInicio.toString().padStart(2, '0');
      franjas.push(`${hh}:00`);
      horaInicio++;
    }
    return franjas;
  }
}
