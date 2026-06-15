import { prisma } from '@/lib/prisma';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { RestriccionInstitucional } from '../configuracion/configuracion.types';

type DatosDocenteActualizables = {
  codigo_ibm?: string;
  modalidad?: string;
  categoria?: string;
  dedicacion?: string;
  telefono?: string | null;
};

type SeccionNoLectivaPayload = {
  seccion: string;
  horas?: number;
  codigo_resolucion?: string | null;
  descripcion?: string | null;
};

type GuardarCargaNoLectivaPayload = {
  docente?: DatosDocenteActualizables;
  secciones?: SeccionNoLectivaPayload[];
  habilita_actividades_gobierno?: boolean;
  habilita_actividades_administracion?: boolean;
};


const prismaDb = prisma as any;
const ESTADO_BORRADOR = 'BORRADOR';
const SECCION_PREPARACION = 'PREPARACION_EVALUACION';
const SECCION_INVESTIGACION = 'INVESTIGACION';
const SECCION_GOBIERNO = 'ACTIVIDADES_GOBIERNO';
const SECCION_ADMINISTRACION = 'ACTIVIDADES_ADMINISTRACION';

const SECCIONES_VALIDAS = new Set([
  'PREPARACION_EVALUACION',
  'CONSEJERIA_TUTORIA',
  'INVESTIGACION',
  'CAPACITACION',
  'ACTIVIDADES_GOBIERNO',
  'ACTIVIDADES_ADMINISTRACION',
  'ASESORIA_TESIS',
  'RESPONSABILIDAD_SOCIAL',
  'COMITES_COMISIONES',
]);

const HORAS_OBJETIVO_POR_DEDICACION: Record<string, number> = {
  TIEMPO_COMPLETO_40H: 40,
  DEDICACION_EXCLUSIVA_40H: 40,
  TIEMPO_PARCIAL_20H: 20,
  TIEMPO_PARCIAL_16H: 16,
  TIEMPO_PARCIAL_12H: 12,
  TIEMPO_PARCIAL_10H: 10,
  TIEMPO_PARCIAL_8H: 8,
};

const LIMITE_FIJO_POR_SECCION: Record<string, number> = {
  INVESTIGACION: 6,
};

const MODALIDADES_VALIDAS = new Set(['NOMBRADO', 'CONTRATADO']);
const CATEGORIAS_VALIDAS = new Set(['PRINCIPAL', 'ASOCIADO', 'JEFE_PRACTICA', 'AUXILIAR', 'PROFESOR', 'ALUMNO']);
const DEDICACIONES_VALIDAS = new Set(Object.keys(HORAS_OBJETIVO_POR_DEDICACION));
const DIAS_VALIDOS = new Set(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']);

const FORMATOS_BASE = [
  { tipo: 'CARGA_HORARIA_CENTRAL', etiqueta: 'FORMATO #1 Carga Horaria Asignada (Sede Central)', sede: 'Central' },
  { tipo: 'DECLARACION_JURADA_CENTRAL', etiqueta: 'FORMATO #2 Declaración Jurada (Sede Central)', sede: 'Central' },
  { tipo: 'CARGA_HORARIA_DESCONCENTRADA', etiqueta: 'FORMATO #1 Carga Horaria Asignada (Sedes Desconcentradas)', sede: 'Sedes Desconcentradas' },
  { tipo: 'DECLARACION_JURADA_DESCONCENTRADA', etiqueta: 'FORMATO #2 Declaración Jurada (Sedes Desconcentradas)', sede: 'Sedes Desconcentradas' },
  { tipo: 'HORARIO_SEMANAL_DOCENTE', etiqueta: 'FORMATO #3 Horario Semanal del Personal Docente', sede: 'Central' },
];

const normalizarNumero = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const redondear = (valor: number) => Math.round(valor * 100) / 100;

const parseHoraMinutos = (hora: unknown) => {
  if (hora instanceof Date) {
    return (hora.getUTCHours() * 60) + hora.getUTCMinutes();
  }
  const valor = String(hora ?? '').trim();
  const match = /^(\d{2}):(\d{2})/.exec(valor);
  if (!match) return null;
  
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    return null;
  }
  return (horas * 60) + minutos;
};

const calcularDuracionHoras = (horaInicio: string, horaFin: string) => {
  const inicio = parseHoraMinutos(horaInicio);
  const fin = parseHoraMinutos(horaFin);
  if (inicio === null || fin === null || fin <= inicio) {
    return null;
  }
  return redondear((fin - inicio) / 60);
};

const normalizarSecciones = (secciones: SeccionNoLectivaPayload[]) => {
  const seccionesFiltradas = secciones
    .filter((seccion) => seccion && typeof seccion.seccion === 'string' && SECCIONES_VALIDAS.has(seccion.seccion))
    .map((seccion) => ({
      seccion: seccion.seccion,
      horas: redondear(Math.max(0, normalizarNumero(seccion.horas))),
      codigo_resolucion: seccion.codigo_resolucion ?? null,
      descripcion: seccion.descripcion ?? null,
    }))
    .filter((seccion) => seccion.horas > 0);

  const mapa = new Map<string, (typeof seccionesFiltradas)[number]>();
  for (const seccion of seccionesFiltradas) {
    mapa.set(seccion.seccion, seccion);
  }

  return Array.from(mapa.values());
};

const construirSugerenciasIniciales = (horasLectivas: number, config: RestriccionInstitucional) => {
  const minPreparacion = redondear(horasLectivas * config.limiteMinPreparacionPct);
  return {
    PREPARACION_EVALUACION: minPreparacion > 0 ? minPreparacion : 0,
    CONSEJERIA_TUTORIA: 2,
    INVESTIGACION: 0,
    CAPACITACION: 0,
    ACTIVIDADES_GOBIERNO: 0,
    ACTIVIDADES_ADMINISTRACION: 0,
    ASESORIA_TESIS: 2,
    RESPONSABILIDAD_SOCIAL: 0,
    COMITES_COMISIONES: 0,
  };
};

const construirReglas = (horasLectivas: number, dedicacion: string, config: RestriccionInstitucional) => {
  const horasObjetivo = HORAS_OBJETIVO_POR_DEDICACION[dedicacion] ?? 40;
  return {
    horas_objetivo: horasObjetivo,
    horas_lectivas: redondear(horasLectivas),
    horas_no_lectivas_requeridas: redondear(Math.max(0, horasObjetivo - horasLectivas)),
    limite_min_preparacion_evaluacion: redondear(horasLectivas * config.limiteMinPreparacionPct),
    limites_fijos_por_seccion: {
      ...LIMITE_FIJO_POR_SECCION,
      ASESORIA_TESIS: config.limiteMaxAsesoriaTesis,
      CAPACITACION: config.limiteMaxCapacitacion,
      INVESTIGACION: config.limiteMaxInvestigacion,
    } as Record<string, number>,
  };
};

const validarSecciones = (params: {
  secciones: Array<{ seccion: string; horas: number }>;
  reglas: ReturnType<typeof construirReglas>;
  config: RestriccionInstitucional;
  habilitaGobierno: boolean;
  habilitaAdministracion: boolean;
}) => {
  const { secciones, reglas, config, habilitaGobierno, habilitaAdministracion } = params;

  for (const seccion of secciones) {
    if (seccion.seccion === SECCION_PREPARACION && seccion.horas < reglas.limite_min_preparacion_evaluacion) {
      throw new Error(
        `Preparación y Evaluación no alcanza el mínimo requerido (${reglas.limite_min_preparacion_evaluacion}h), que es equivalente al ${config.limiteMinPreparacionPct * 100}% de la carga lectiva.`
      );
    }

    const limiteFijo = reglas.limites_fijos_por_seccion[seccion.seccion];
    if (typeof limiteFijo === 'number' && seccion.horas > limiteFijo) {
      throw new Error(`La sección ${seccion.seccion} excede el máximo permitido (${limiteFijo}h).`);
    }

    if (seccion.seccion === SECCION_GOBIERNO && !habilitaGobierno && seccion.horas > 0) {
      throw new Error('No puede declarar horas en Actividades de Gobierno sin habilitar cargo por elección.');
    }

    if (seccion.seccion === SECCION_ADMINISTRACION && !habilitaAdministracion && seccion.horas > 0) {
      throw new Error('No puede declarar horas en Actividades de Administración sin habilitar cargo por encargatura/confianza.');
    }
  }
};

const validarDocenteActualizable = (docente: DatosDocenteActualizables | undefined) => {
  if (!docente) {
    return;
  }

  if (docente.modalidad !== undefined && !MODALIDADES_VALIDAS.has(String(docente.modalidad))) {
    throw new Error('La condición del docente es inválida.');
  }

  if (docente.categoria !== undefined && !CATEGORIAS_VALIDAS.has(String(docente.categoria))) {
    throw new Error('La categoría del docente es inválida.');
  }

  if (docente.dedicacion !== undefined && !DEDICACIONES_VALIDAS.has(String(docente.dedicacion))) {
    throw new Error('La dedicación del docente es inválida.');
  }
};

const validarHorarioSinCruces = (bloques: Array<{ dia_semana: string; hora_inicio: string; hora_fin: string; origen: string }>) => {
  const porDia = new Map<string, Array<{ inicio: number; fin: number; origen: string }>>();

  for (const bloque of bloques) {
    const inicio = parseHoraMinutos(bloque.hora_inicio);
    const fin = parseHoraMinutos(bloque.hora_fin);
    if (inicio === null || fin === null || fin <= inicio) {
      throw new Error(`Bloque horario inválido en ${bloque.dia_semana}: ${bloque.hora_inicio}-${bloque.hora_fin}.`);
    }
    const lista = porDia.get(bloque.dia_semana) ?? [];
    lista.push({ inicio, fin, origen: bloque.origen });
    porDia.set(bloque.dia_semana, lista);
  }

  for (const [dia, lista] of porDia.entries()) {
    lista.sort((a, b) => a.inicio - b.inicio);
    for (let i = 1; i < lista.length; i++) {
      const previo = lista[i - 1];
      const actual = lista[i];
      if (actual.inicio < previo.fin) {
        throw new Error(`Existe cruce de horario en ${dia} entre bloques ${previo.origen} y ${actual.origen}.`);
      }
    }
  }
};

const calcularHorasLectivas = async (tx: any, idDocente: number, idPeriodo: number) => {
  const agregado = await tx.asignacion_docente_componente.aggregate({
    _sum: { horas_asignadas: true },
    where: {
      id_docente: idDocente,
      componente: {
        oferta: {
          id_periodo: idPeriodo,
        },
      },
    },
  });

  return redondear(Number(agregado?._sum?.horas_asignadas ?? 0));
};

export class CargaNoLectivaService {
  static async obtenerMiDeclaracion(idDocente: number, idPeriodo: number) {
    const [docente, declaracion, periodo] = await Promise.all([
      prismaDb.docente.findUnique({
        where: { id: idDocente },
      }),
      prismaDb.declaracion_carga.findFirst({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
        include: {
          secciones: true,
        },
      }),
      // ── NUEVO: consultar el periodo para exponer nombre, fecha_inicio y fecha_fin ──
      prismaDb.periodo_academico.findUnique({
        where: { id: idPeriodo },
        select: {
          id: true,
          nombre: true,
          fecha_inicio: true,
          fecha_fin: true,
          estado: true,
        },
      }),
    ]);

    const formatosGenerados = await prismaDb.formato_generado.findMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
      orderBy: { tipo_formato: 'asc' },
    });

    const cargaLectiva = await prismaDb.asignacion_docente_componente.findMany({
      where: {
        id_docente: idDocente,
        componente: {
          oferta: { id_periodo: idPeriodo },
        },
      },
      select: {
        horas_asignadas: true,
        componente: {
          select: {
            tipo: true,
            oferta: {
              select: {
                curso: { select: { codigo: true, nombre: true } },
                ciclo: { select: { numero: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: [{ componente: { oferta: { curso: { nombre: 'asc' } } } }],
    });

    const horasLectivas = await calcularHorasLectivas(prismaDb, idDocente, idPeriodo);
    const config = await ConfiguracionService.obtenerRestricciones();
    const reglas = construirReglas(horasLectivas, docente?.dedicacion ?? 'TIEMPO_COMPLETO_40H', config);
    const sugerencias = construirSugerenciasIniciales(horasLectivas, config);

    const banderas = {
      habilita_actividades_gobierno: declaracion?.secciones?.some((s: any) => s.seccion === SECCION_GOBIERNO && Number(s.horas_declaradas) > 0) ?? false,
      habilita_actividades_administracion: declaracion?.secciones?.some((s: any) => s.seccion === SECCION_ADMINISTRACION && Number(s.horas_declaradas) > 0) ?? false,
    };

    return {
      docente,
      declaracion,
      // ── NUEVO: periodo incluido en la respuesta ──
      periodo,
      reglas,
      secciones_sugeridas: sugerencias,
      banderas,
      carga_lectiva: cargaLectiva.map((item: any) => ({
        curso_codigo: item.componente?.oferta?.curso?.codigo ?? '-',
        curso_nombre: item.componente?.oferta?.curso?.nombre ?? '-',
        ciclo: item.componente?.oferta?.ciclo?.nombre ?? item.componente?.oferta?.ciclo?.numero ?? '-',
        componente: item.componente?.tipo ?? '-',
        horas: Number(item.horas_asignadas ?? 0),
      })),
      formatos: FORMATOS_BASE.map((formatoBase) => {
        const generado = formatosGenerados.find((f: any) => f.tipo_formato === formatoBase.tipo);
        return {
          ...formatoBase,
          estado: generado?.ruta_archivo ? 'GENERADO' : 'INICIADO',
          ruta_archivo: generado?.ruta_archivo ?? null,
          fecha_generacion: generado?.fecha_generacion ?? null,
        };
      }),
    };
  }

  static async guardarMiDeclaracion(
    idDocente: number,
    idPeriodo: number,
    payload: GuardarCargaNoLectivaPayload
  ) {
    const seccionesNormalizadas = normalizarSecciones(Array.isArray(payload.secciones) ? payload.secciones : []);
    const habilitaGobierno = payload.habilita_actividades_gobierno === true;
    const habilitaAdministracion = payload.habilita_actividades_administracion === true;

    return prisma.$transaction(async (tx) => {
      const docenteActual = await (tx as any).docente.findUnique({ where: { id: idDocente } });
      if (!docenteActual) {
        throw new Error('Docente no encontrado');
      }

      validarDocenteActualizable(payload.docente);

      const docenteData: Record<string, unknown> = {};
      if (payload.docente?.codigo_ibm !== undefined) {
        const codigoIbm = String(payload.docente.codigo_ibm ?? '').trim();
        if (!docenteActual.codigo_ibm) {
          docenteData.codigo_ibm = codigoIbm;
        } else if (codigoIbm && codigoIbm !== docenteActual.codigo_ibm) {
          throw new Error('El código IBM es inmutable y no puede modificarse.');
        }
      }
      if (payload.docente?.modalidad !== undefined) docenteData.modalidad = String(payload.docente.modalidad ?? '');
      if (payload.docente?.categoria !== undefined) docenteData.categoria = String(payload.docente.categoria ?? '');
      if (payload.docente?.dedicacion !== undefined) docenteData.dedicacion = payload.docente.dedicacion;
      if (payload.docente?.telefono !== undefined) docenteData.telefono = payload.docente.telefono;

      if (Object.keys(docenteData).length > 0) {
        await (tx as any).docente.update({
          where: { id: idDocente },
          data: docenteData,
        });
      }

      const docenteActualizado = Object.keys(docenteData).length > 0
        ? await (tx as any).docente.findUnique({ where: { id: idDocente } })
        : docenteActual;

      const horasLectivas = await calcularHorasLectivas(tx, idDocente, idPeriodo);
      const config = await ConfiguracionService.obtenerRestricciones();
      const reglas = construirReglas(horasLectivas, docenteActualizado?.dedicacion ?? docenteActual?.dedicacion ?? 'TIEMPO_COMPLETO_40H', config);

      validarSecciones({
        secciones: seccionesNormalizadas.map((s) => ({ seccion: s.seccion, horas: s.horas })),
        reglas,
        config,
        habilitaGobierno: !!payload.habilita_actividades_gobierno,
        habilitaAdministracion: !!payload.habilita_actividades_administracion,
      });

      const totalHorasNoLectivas = redondear(seccionesNormalizadas.reduce((acumulado, seccion) => acumulado + seccion.horas, 0));
      const totalHoras = redondear(horasLectivas + totalHorasNoLectivas);

      if (horasLectivas === 0) {
        throw new Error('Debe tener su carga horaria (lectiva) asignada por el director antes de poder declarar su carga no lectiva.');
      }

      if (Math.abs(totalHoras - reglas.horas_objetivo) > 0.01) {
        throw new Error(
          `La suma de carga lectiva (${horasLectivas}h) y no lectiva (${totalHorasNoLectivas}h) debe completar ${reglas.horas_objetivo}h según la dedicación seleccionada.`
        );
      }

      let declaracion = await (tx as any).declaracion_carga.findFirst({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
      });

      if (!declaracion) {
        declaracion = await (tx as any).declaracion_carga.create({
          data: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
            total_horas_lectivas: horasLectivas,
            total_horas_no_lectivas: totalHorasNoLectivas,
            total_horas: totalHoras,
            estado: ESTADO_BORRADOR,
          },
        });
      } else {
        declaracion = await (tx as any).declaracion_carga.update({
          where: { id: declaracion.id },
          data: {
            total_horas_lectivas: horasLectivas,
            total_horas_no_lectivas: totalHorasNoLectivas,
            total_horas: totalHoras,
            fecha_declaracion: new Date(),
            estado: ESTADO_BORRADOR,
          },
        });
      }

      await (tx as any).carga_no_lectiva.deleteMany({
        where: { id_declaracion: declaracion.id },
      });

      if (seccionesNormalizadas.length > 0) {
        await (tx as any).carga_no_lectiva.createMany({
          data: seccionesNormalizadas.map((seccion) => ({
            id_declaracion: declaracion.id,
            id_docente: idDocente,
            id_periodo: idPeriodo,
            seccion: seccion.seccion,
            descripcion: seccion.descripcion ?? null,
            horas_declaradas: seccion.horas,
            codigo_resolucion: seccion.codigo_resolucion ?? null,
            valido: true,
            observacion: null,
            fecha_modificacion: new Date(),
          })),
        });
      }

      for (const formatoBase of FORMATOS_BASE) {
        await (tx as any).formato_generado.upsert({
          where: {
            id_docente_id_periodo_tipo_formato: {
              id_docente: idDocente,
              id_periodo: idPeriodo,
              tipo_formato: formatoBase.tipo,
            },
          },
          update: {},
          create: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
            id_declaracion: declaracion.id,
            tipo_formato: formatoBase.tipo,
            ruta_archivo: null,
          },
        });
      }

      return this.obtenerMiDeclaracion(idDocente, idPeriodo);
    });
  }

  static async eliminarMiDeclaracion(idDocente: number, idPeriodo: number) {
    await prismaDb.declaracion_carga.deleteMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
    });

    return { mensaje: 'Declaración no lectiva eliminada' };
  }

  static async obtenerMiHorarioNoLectivo(idDocente: number, idPeriodo: number) {
    const formatHora = (hora: unknown) => {
      if (hora instanceof Date) {
        return `${hora.getUTCHours().toString().padStart(2, '0')}:${hora.getUTCMinutes().toString().padStart(2, '0')}`;
      }
      return String(hora ?? '').substring(0, 5);
    };

    const noLectivosRaw = await prismaDb.bloque_no_lectivo.findMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
    });

    const noLectivos = noLectivosRaw.map((b: any) => ({
      dia_semana: b.dia_semana,
      hora_inicio: formatHora(b.hora_inicio),
      hora_fin: formatHora(b.hora_fin),
      seccion: b.seccion,
    }));

    const lectivosRaw = await prismaDb.bloque_horario.findMany({
      where: { id_docente: idDocente, id_periodo: idPeriodo },
      include: {
        componente: {
          include: {
            oferta: {
              include: {
                curso: true,
                ciclo: true,
              },
            },
          },
        },
        ambiente: true,
        grupo: true,
      },
    });

    const lectivos = lectivosRaw.map((b: any) => ({
      dia_semana: b.dia_semana,
      hora_inicio: formatHora(b.hora_inicio),
      hora_fin: formatHora(b.hora_fin),
      origen: `${b.componente?.oferta?.curso?.codigo ?? 'Desconocido'} - ${b.componente?.tipo ?? ''}`,
      curso_nombre: b.componente?.oferta?.curso?.nombre ?? '',
      curso_codigo: b.componente?.oferta?.curso?.codigo ?? '',
      tipo_componente: b.componente?.tipo ?? 'TEORIA',
      ciclo: b.componente?.oferta?.ciclo?.numero ?? null,
      ciclo_nombre: b.componente?.oferta?.ciclo?.nombre ?? null,
      grupo: b.grupo?.codigo ?? '',
      ambiente: b.ambiente?.codigo ?? 'F11',
    }));

    return { lectivos, no_lectivos: noLectivos };
  }

  static async guardarMiHorarioNoLectivo(idDocente: number, idPeriodo: number, bloques: any[]) {
    return await prismaDb.$transaction(async (tx: any) => {
      const lectivos = await tx.bloque_horario.findMany({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
        include: { componente: { include: { oferta: { include: { curso: true } } } } },
      });

      const todos = [
        ...lectivos.map((b: any) => ({
          dia_semana: b.dia_semana,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          origen: `Lectivo (${b.componente?.oferta?.curso?.codigo ?? 'Desconocido'})`,
        })),
        ...bloques.map((b: any) => ({
          dia_semana: b.dia_semana,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          origen: `No Lectivo (${b.seccion})`,
        })),
      ];

      validarHorarioSinCruces(todos);

      await tx.bloque_no_lectivo.deleteMany({
        where: { id_docente: idDocente, id_periodo: idPeriodo },
      });

      if (bloques && bloques.length > 0) {
        await tx.bloque_no_lectivo.createMany({
          data: bloques.map((b: any) => ({
            id_docente: idDocente,
            id_periodo: idPeriodo,
            seccion: b.seccion,
            dia_semana: b.dia_semana,
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
          })),
        });
      }

      return this.obtenerMiHorarioNoLectivo(idDocente, idPeriodo);
    });
  }
}