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
    idDocente?: number,
    idComponente?: number
  ): Promise<MatrizDisponibilidad> {
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    if (!ambiente) throw new Error('Ambiente no encontrado');

    // Obtener información del ciclo si se proporciona un componente
    let idCicloReferencia: number | null = null;
    if (idComponente) {
      const comp = await prisma.curso_componente.findUnique({
        where: { id: idComponente },
        include: { oferta: true },
      });
      if (comp) idCicloReferencia = comp.oferta.id_ciclo;
    }

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

    // 3. Horarios del CICLO actual (si aplica, en cualquier ambiente)
    const horariosCiclo = idCicloReferencia
      ? await prisma.bloque_horario.findMany({
          where: {
            id_periodo: idPeriodo,
            componente: {
              oferta: { id_ciclo: idCicloReferencia },
            },
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: {
            componente: { include: { oferta: { include: { curso: true } } } },
          },
        })
      : [];

    // 4. Selecciones temporales
    const todasLasSelecciones = await GestorSeleccionTemporal.obtenerTodasLasSelecciones();
    
    // Filtrar selecciones relevantes para el docente, ambiente y ciclo
    const seleccionesTemporalesAmbiente = todasLasSelecciones.filter(s => s.idAmbiente === idAmbiente);
    const seleccionesTemporalesDocente = todasLasSelecciones.filter(s => s.idDocente === idDocente);
    
    // Obtener ciclos de las selecciones temporales para validar conflictos de ciclo
    const seleccionesTemporalesCiclo: any[] = [];
    if (idCicloReferencia) {
      for (const sel of todasLasSelecciones) {
        const compSel = await prisma.curso_componente.findUnique({
          where: { id: sel.idComponente },
          include: { oferta: { include: { curso: true } } },
        });
        if (compSel?.oferta.id_ciclo === idCicloReferencia) {
          seleccionesTemporalesCiclo.push({ ...sel, nombreCurso: compSel.oferta.curso.nombre });
        }
      }
    }

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

        // 1. ¿Tiene el docente actual alguna clase o selección temporal propia en este horario?
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
              ambienteCodigo: 'Pendiente',
              curso: 'Mi Selección',
              tipoComponente: '',
              grupo: '',
              confirmado: false,
              estadoBloque: 'TEMPORAL',
            },
          };
        }

        // 2. ¿Tiene el CICLO actual alguna clase o selección temporal en este horario? (NUEVA VALIDACIÓN)
        const bloqueCicloBD = horariosCiclo.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueCicloBD) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: `Ciclo ${idCicloReferencia} ocupado por: ${bloqueCicloBD.componente.oferta.curso.nombre}`,
            },
          };
        }

        const temporalCiclo = seleccionesTemporalesCiclo.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora && s.idDocente !== idDocente
        );
        if (temporalCiclo) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: `Ciclo ${idCicloReferencia} ocupado temporalmente por otro curso`,
            },
          };
        }

        // 3. ¿Está ocupado el ambiente actual por OTRO docente?
        const bloqueAmbienteBD = horariosAsignadosAmbiente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueAmbienteBD) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: `Ambiente ocupado por ${bloqueAmbienteBD.componente.oferta.curso.nombre} (${bloqueAmbienteBD.docente?.nombres} ${bloqueAmbienteBD.docente?.apellidos})`,
            },
          };
        }

        const temporalAmbiente = seleccionesTemporalesAmbiente.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora && s.idDocente !== idDocente
        );
        if (temporalAmbiente) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: 'Ambiente ocupado temporalmente por otro docente',
            },
          };
        }

        // 4. Celda libre
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
