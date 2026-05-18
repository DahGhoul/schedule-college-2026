import { prisma } from '@/lib/prisma';

type Restricciones = {
  franjaInicio: string;
  franjaFin: string;
  horasMaximasDiarias: number;
  bloqueoAlmuerzoInicio: string;
  bloqueoAlmuerzoFin: string;
};

type OpcionGeneracion = {
  idPeriodo: number;
  idCiclo?: number | null;
  modoPrueba?: boolean;
};

type DisponibilidadSlot = {
  id_docente?: number;
  id_ambiente?: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
};

type BloqueGenerado = {
  id_periodo: number;
  id_docente: number;
  id_curso: number;
  id_grupo: number | null;
  id_ambiente: number;
  tipo_clase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'BORRADOR';
};

type AmbienteDisponible = {
  id: number;
  codigo: string;
  tipo: string;
  capacidad: number;
};

type DocenteCandidato = {
  docente: {
    id: number;
    nombres: string;
    apellidos: string;
    disponibilidad: DisponibilidadSlot[];
  };
  curso: {
    id: number;
    nombre: string;
    codigo: string;
    horas_teoria: number;
    horas_practica: number;
    horas_laboratorio: number;
    ambientes: Array<{
      id_ambiente: number;
      tipo_clase: string;
      ambiente: AmbienteDisponible;
    }>;
  };
};

type CursoComponent = {
  tipo: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  horas: number;
  requiereGrupos: boolean;
};

type SlotEvaluado = {
  dia: string;
  hora: string;
  ambiente: AmbienteDisponible;
  puntaje: number;
};

type TareaGeneracion = {
  curso: DocenteCandidato['curso'];
  grupoId: number | null;
  tipo: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  horas: number;
};

type Gen = number[];

type SlotGenetico = {
  dia: string;
  hora: string;
  ambiente: AmbienteDisponible;
  docenteId: number;
  cursoId: number;
  grupoId: number | null;
  tipo: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
};

type CandidatosTarea = {
  tarea: TareaGeneracion;
  candidatos: SlotGenetico[];
};

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;
const PREFIJOS_AMBIENTE: Record<'TEORIA' | 'PRACTICA' | 'LABORATORIO', string[]> = {
  TEORIA: ['AULA'],
  PRACTICA: ['AULA', 'LABORATORIO'],
  LABORATORIO: ['LABORATORIO'],
};

export class GeneradorHorariosService {
  static async generar(opciones: OpcionGeneracion) {
    if ((opciones as any).metodo === 'GENETICO') {
      return this.generarGenetico(opciones);
    }

    const periodo = await prisma.periodo_academico.findUnique({ where: { id: opciones.idPeriodo } });
    if (!periodo) throw new Error('Período no encontrado');

    const restricciones = await this.obtenerRestricciones(opciones.idPeriodo);
    const horasDisponibles = this.generarHoras(restricciones.franjaInicio, restricciones.franjaFin).filter(
      (hora) => !this.estaEnBloqueoAlmuerzo(hora, restricciones)
    );

    const cursosPermitidos = opciones.idCiclo
      ? new Set((await prisma.curso_ciclo.findMany({ where: { id_ciclo: opciones.idCiclo } })).map((item) => item.id_curso))
      : null;

    const cursos = await prisma.curso.findMany({
      where: {
        activo: true,
        ...(cursosPermitidos ? { id: { in: Array.from(cursosPermitidos) } } : {}),
      },
      include: {
        docentes: {
          include: { docente: { include: { disponibilidad: true } } },
        },
        grupos: { where: { activo: true }, orderBy: { capacidad_maxima: 'asc' } },
        ambientes: { include: { ambiente: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    });

    const docentes = await prisma.docente.findMany({
      where: { activo: true },
      include: { disponibilidad: true },
    });

    const ambientes = await prisma.ambiente.findMany({ where: { activo: true } });
    const disponibilidadAmbiente = await prisma.disponibilidad_ambiente.findMany({
      where: { disponible: true },
    });

    const disponibilidadDocenteMapa = this.crearMapaDisponibilidad(
      docentes.flatMap((docente) =>
        docente.disponibilidad.map((slot) => ({
          id_docente: docente.id,
          dia_semana: slot.dia_semana,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          disponible: slot.disponible,
        }))
      )
    );

    const disponibilidadAmbienteMapa = this.crearMapaDisponibilidad(
      disponibilidadAmbiente.map((slot) => ({
        id_ambiente: slot.id_ambiente,
        dia_semana: slot.dia_semana,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        disponible: slot.disponible,
      }))
    );

    const horariosExistentes = await prisma.horario_asignado.findMany({
      where: { id_periodo: opciones.idPeriodo },
      select: { id_docente: true, id_ambiente: true, dia_semana: true, hora_inicio: true },
    });

    const ocupacionDocente = new Set(horariosExistentes.map((item) => `${item.id_docente}|${item.dia_semana}|${item.hora_inicio}`));
    const ocupacionAmbiente = new Set(horariosExistentes.map((item) => `${item.id_ambiente}|${item.dia_semana}|${item.hora_inicio}`));

    const bloquesGenerados: BloqueGenerado[] = [];
    const noAsignados: Array<{ curso: string; tipoClase: string; horas: number }> = [];

    for (const curso of cursos) {
      const candidatosDocente = curso.docentes.length > 0
        ? curso.docentes.map((item) => ({
            docente: {
              id: item.docente.id,
              nombres: item.docente.nombres,
              apellidos: item.docente.apellidos,
              disponibilidad: item.docente.disponibilidad,
            },
            curso,
          }))
        : docentes.map((docente) => ({
            docente: {
              id: docente.id,
              nombres: docente.nombres,
              apellidos: docente.apellidos,
              disponibilidad: docente.disponibilidad,
            },
            curso,
          }));

      const componentes = this.obtenerComponentesCurso(curso);

      for (const componente of componentes) {
        if (componente.horas <= 0) continue;

        const gruposObjetivo = componente.requiereGrupos && curso.grupos.length > 0 ? curso.grupos : [null];
        const gruposMax = componente.requiereGrupos && curso.grupos.length > 0 ? curso.grupos.length : 1;
        let horasPendientesTotal = componente.horas * gruposMax;

        for (const grupo of gruposObjetivo) {
          const candidatoSeleccionado = await this.seleccionarMejorDocente({
            candidatos: candidatosDocente,
            componente,
            curso,
            grupoId: grupo?.id ?? null,
            horasDisponibles,
            ambientes,
            disponibilidadDocenteMapa,
            disponibilidadAmbienteMapa,
            ocupacionDocente,
            ocupacionAmbiente,
            restricciones,
            modoPrueba: !!opciones.modoPrueba,
          });

          if (!candidatoSeleccionado) {
            noAsignados.push({
              curso: curso.nombre,
              tipoClase: componente.tipo,
              horas: componente.horas,
            });
            continue;
          }

          const resultado = await this.armarBloquesParaGrupo({
            periodoId: opciones.idPeriodo,
            curso,
            grupoId: grupo?.id ?? null,
            componente,
            docenteId: candidatoSeleccionado.id,
            horasDisponibles,
            ambientes,
            disponibilidadDocenteMapa,
            disponibilidadAmbienteMapa,
            ocupacionDocente,
            ocupacionAmbiente,
            restricciones,
            modoPrueba: !!opciones.modoPrueba,
          });

          bloquesGenerados.push(...resultado.bloques);
          horasPendientesTotal -= resultado.bloques.length;

          for (const bloque of resultado.bloques) {
            ocupacionDocente.add(`${bloque.id_docente}|${bloque.dia_semana}|${bloque.hora_inicio}`);
            ocupacionAmbiente.add(`${bloque.id_ambiente}|${bloque.dia_semana}|${bloque.hora_inicio}`);
          }
        }

        if (horasPendientesTotal > 0) {
          noAsignados.push({
            curso: curso.nombre,
            tipoClase: componente.tipo,
            horas: horasPendientesTotal,
          });
        }
      }
    }

    if (bloquesGenerados.length > 0) {
      await prisma.horario_asignado.createMany({ data: bloquesGenerados });
    }

    return {
      periodo: periodo.nombre,
      creados: bloquesGenerados.length,
      noAsignados,
      modoPrueba: !!opciones.modoPrueba,
    };
  }

  static async generarGenetico(opciones: OpcionGeneracion) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: opciones.idPeriodo } });
    if (!periodo) throw new Error('Período no encontrado');

    const restricciones = await this.obtenerRestricciones(opciones.idPeriodo);
    const horasDisponibles = this.generarHoras(restricciones.franjaInicio, restricciones.franjaFin).filter(
      (hora) => !this.estaEnBloqueoAlmuerzo(hora, restricciones)
    );

    const cursosPermitidos = opciones.idCiclo
      ? new Set((await prisma.curso_ciclo.findMany({ where: { id_ciclo: opciones.idCiclo } })).map((item) => item.id_curso))
      : null;

    const cursos = await prisma.curso.findMany({
      where: {
        activo: true,
        ...(cursosPermitidos ? { id: { in: Array.from(cursosPermitidos) } } : {}),
      },
      include: {
        docentes: { include: { docente: { include: { disponibilidad: true } } } },
        grupos: { where: { activo: true }, orderBy: { capacidad_maxima: 'asc' } },
        ambientes: { include: { ambiente: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    });

    const docentes = await prisma.docente.findMany({ where: { activo: true }, include: { disponibilidad: true } });
    const ambientes = await prisma.ambiente.findMany({ where: { activo: true } });
    const disponibilidadAmbiente = await prisma.disponibilidad_ambiente.findMany({ where: { disponible: true } });

    const disponibilidadDocenteMapa = this.crearMapaDisponibilidad(
      docentes.flatMap((docente) =>
        docente.disponibilidad.map((slot) => ({
          id_docente: docente.id,
          dia_semana: slot.dia_semana,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          disponible: slot.disponible,
        }))
      )
    );

    const disponibilidadAmbienteMapa = this.crearMapaDisponibilidad(
      disponibilidadAmbiente.map((slot) => ({
        id_ambiente: slot.id_ambiente,
        dia_semana: slot.dia_semana,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        disponible: slot.disponible,
      }))
    );

    const horariosExistentes = await prisma.horario_asignado.findMany({
      where: { id_periodo: opciones.idPeriodo },
      select: { id_docente: true, id_ambiente: true, dia_semana: true, hora_inicio: true },
    });

    const ocupacionDocenteBase = new Set(horariosExistentes.map((item) => `${item.id_docente}|${item.dia_semana}|${item.hora_inicio}`));
    const ocupacionAmbienteBase = new Set(horariosExistentes.map((item) => `${item.id_ambiente}|${item.dia_semana}|${item.hora_inicio}`));

    const tareas = this.construirTareas(cursos);
    const tareasConCandidatos = this.construirCandidatosTareas({
      tareas,
      cursos,
      docentes,
      horasDisponibles,
      ambientes,
      disponibilidadDocenteMapa,
      disponibilidadAmbienteMapa,
      ocupacionDocenteBase,
      ocupacionAmbienteBase,
      restricciones,
      modoPrueba: !!opciones.modoPrueba,
    });

    if (tareasConCandidatos.length === 0) {
      return { periodo: periodo.nombre, creados: 0, noAsignados: ['Sin tareas'], modoPrueba: !!opciones.modoPrueba, metodo: 'GENETICO' };
    }

    const poblacion = this.generarPoblacionInicial(tareasConCandidatos, 24);
    let mejor = poblacion[0];
    let mejorFitness = -Infinity;

    for (let generacion = 0; generacion < 40; generacion++) {
      const evaluados = poblacion
        .map((gen) => ({ gen, fitness: this.evaluarGen(gen, tareasConCandidatos, ocupacionDocenteBase, ocupacionAmbienteBase) }))
        .sort((a, b) => b.fitness - a.fitness);

      if (evaluados[0].fitness > mejorFitness) {
        mejorFitness = evaluados[0].fitness;
        mejor = evaluados[0].gen;
      }

      const elite = evaluados.slice(0, 6).map((item) => item.gen);
      const nuevaPoblacion: Gen[] = [...elite];
      while (nuevaPoblacion.length < 24) {
        const padre1 = this.seleccionarPadre(evaluados);
        const padre2 = this.seleccionarPadre(evaluados);
        let hijo = this.cruzar(padre1, padre2);
        hijo = this.mutar(hijo, tareasConCandidatos, 0.18);
        nuevaPoblacion.push(hijo);
      }
      poblacion.splice(0, poblacion.length, ...nuevaPoblacion);
    }

    const bloques = this.convertirGenABloques(mejor, tareasConCandidatos, opciones.idPeriodo);
    if (bloques.length > 0) {
      await prisma.horario_asignado.createMany({ data: bloques });
    }

    return {
      periodo: periodo.nombre,
      creados: bloques.length,
      noAsignados: tareasConCandidatos.filter((item) => item.candidatos.length === 0).map((item) => ({ curso: item.tarea.curso.nombre, tipoClase: item.tarea.tipo, horas: item.tarea.horas })),
      modoPrueba: !!opciones.modoPrueba,
      metodo: 'GENETICO',
      fitness: mejorFitness,
    };
  }

  private static obtenerComponentesCurso(curso: {
    horas_teoria: number;
    horas_practica: number;
    horas_laboratorio: number;
  }): CursoComponent[] {
    return [
      { tipo: 'TEORIA', horas: curso.horas_teoria, requiereGrupos: false },
      { tipo: 'PRACTICA', horas: curso.horas_practica, requiereGrupos: false },
      { tipo: 'LABORATORIO', horas: curso.horas_laboratorio, requiereGrupos: true },
    ];
  }

  private static construirTareas(cursos: Array<DocenteCandidato['curso']>): TareaGeneracion[] {
    const tareas: TareaGeneracion[] = [];
    for (const curso of cursos) {
      for (const componente of this.obtenerComponentesCurso(curso)) {
        if (componente.horas <= 0) continue;
        const grupos = componente.requiereGrupos && curso.grupos.length > 0 ? curso.grupos : [null];
        for (const grupo of grupos) {
          tareas.push({ curso, grupoId: grupo?.id ?? null, tipo: componente.tipo, horas: componente.horas });
        }
      }
    }
    return tareas;
  }

  private static construirCandidatosTareas(params: {
    tareas: TareaGeneracion[];
    cursos: Array<DocenteCandidato['curso']>;
    docentes: Array<{ id: number; disponibilidad: DisponibilidadSlot[] }>;
    horasDisponibles: string[];
    ambientes: AmbienteDisponible[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocenteBase: Set<string>;
    ocupacionAmbienteBase: Set<string>;
    restricciones: Restricciones;
    modoPrueba: boolean;
  }): CandidatosTarea[] {
    return params.tareas.map((tarea) => {
      const cursoRelacionado = params.cursos.find((curso) => curso.id === tarea.curso.id)!;
      const docentesPosibles = cursoRelacionado.docentes.length > 0
        ? cursoRelacionado.docentes.map((item) => ({ id: item.docente.id, disponibilidad: item.docente.disponibilidad }))
        : params.docentes;

      const ambientesPermitidosPorCurso = cursoRelacionado.ambientes
        .filter((relacion) => relacion.tipo_clase === tarea.tipo)
        .map((relacion) => relacion.ambiente.id);

      const ambientesCompatibles = params.ambientes.filter((ambiente) => {
        const coincideTipo = PREFIJOS_AMBIENTE[tarea.tipo].some((prefijo) => ambiente.tipo === prefijo);
        const coincideCurso = ambientesPermitidosPorCurso.length === 0 || ambientesPermitidosPorCurso.includes(ambiente.id);
        return coincideTipo && coincideCurso;
      });

      const candidatos: SlotGenetico[] = [];
      for (const docente of docentesPosibles) {
        for (const dia of DIAS) {
          for (const hora of params.horasDisponibles) {
            if (!this.slotDisponibleDocente(docente.id, dia, hora, params.disponibilidadDocenteMapa, params.ocupacionDocenteBase)) continue;
            for (const ambiente of ambientesCompatibles) {
              if (!params.modoPrueba && tarea.grupoId) {
                const grupo = cursoRelacionado.grupos.find((g) => g.id === tarea.grupoId);
                if (grupo && grupo.capacidad_maxima > ambiente.capacidad) continue;
              }
              if (!this.slotDisponibleAmbiente(ambiente.id, dia, hora, params.disponibilidadAmbienteMapa, params.ocupacionAmbienteBase)) continue;
              candidatos.push({ dia, hora, ambiente, docenteId: docente.id, cursoId: tarea.curso.id, grupoId: tarea.grupoId, tipo: tarea.tipo });
            }
          }
        }
      }

      return { tarea, candidatos };
    });
  }

  private static generarPoblacionInicial(tareas: CandidatosTarea[], cantidad: number): Gen[] {
    const poblacion: Gen[] = [];
    for (let i = 0; i < cantidad; i++) {
      poblacion.push(tareas.map((item) => (item.candidatos.length > 0 ? Math.floor(Math.random() * item.candidatos.length) : -1)));
    }
    return poblacion;
  }

  private static evaluarGen(gen: Gen, tareas: CandidatosTarea[], ocupacionDocenteBase: Set<string>, ocupacionAmbienteBase: Set<string>) {
    const ocupacionDocente = new Set(ocupacionDocenteBase);
    const ocupacionAmbiente = new Set(ocupacionAmbienteBase);
    let fitness = 0;

    gen.forEach((indice, idx) => {
      const item = tareas[idx];
      const candidato = indice >= 0 ? item.candidatos[indice] : null;
      if (!candidato) {
        fitness -= 250;
        return;
      }

      const claveDocente = `${candidato.docenteId}|${candidato.dia}|${candidato.hora}`;
      const claveAmbiente = `${candidato.ambiente.id}|${candidato.dia}|${candidato.hora}`;
      const choque = ocupacionDocente.has(claveDocente) || ocupacionAmbiente.has(claveAmbiente);
      if (choque) {
        fitness -= 400;
        return;
      }

      ocupacionDocente.add(claveDocente);
      ocupacionAmbiente.add(claveAmbiente);
      fitness += 120;
      fitness += candidato.ambiente.tipo === 'LABORATORIO' && item.tarea.tipo === 'LABORATORIO' ? 25 : 0;
      fitness += candidato.ambiente.tipo === 'AULA' && item.tarea.tipo !== 'LABORATORIO' ? 12 : 0;
      fitness -= parseInt(candidato.hora.slice(0, 2), 10) >= 18 ? 8 : 0;
    });

    return fitness;
  }

  private static seleccionarPadre(evaluados: Array<{ gen: Gen; fitness: number }>) {
    const top = evaluados.slice(0, Math.max(2, Math.floor(evaluados.length / 2)));
    return top[Math.floor(Math.random() * top.length)].gen;
  }

  private static cruzar(padre1: Gen, padre2: Gen): Gen {
    const punto = Math.floor(Math.random() * padre1.length);
    return padre1.map((valor, indice) => (indice < punto ? valor : padre2[indice]));
  }

  private static mutar(gen: Gen, tareas: CandidatosTarea[], tasa = 0.1): Gen {
    return gen.map((valor, indice) => {
      const item = tareas[indice];
      if (Math.random() > tasa || item.candidatos.length === 0) return valor;
      return Math.floor(Math.random() * item.candidatos.length);
    });
  }

  private static convertirGenABloques(gen: Gen, tareas: CandidatosTarea[], periodoId: number) {
    const bloques: BloqueGenerado[] = [];
    gen.forEach((indice, idx) => {
      const item = tareas[idx];
      const candidato = indice >= 0 ? item.candidatos[indice] : null;
      if (!candidato) return;
      bloques.push({
        id_periodo: periodoId,
        id_docente: candidato.docenteId,
        id_curso: candidato.cursoId,
        id_grupo: candidato.grupoId,
        id_ambiente: candidato.ambiente.id,
        tipo_clase: candidato.tipo,
        dia_semana: candidato.dia,
        hora_inicio: candidato.hora,
        hora_fin: this.sumarUnaHora(candidato.hora),
        estado: 'BORRADOR',
      });
    });
    return bloques;
  }

  private static async seleccionarMejorDocente(params: {
    candidatos: DocenteCandidato[];
    componente: CursoComponent;
    curso: DocenteCandidato['curso'];
    grupoId: number | null;
    horasDisponibles: string[];
    ambientes: AmbienteDisponible[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocente: Set<string>;
    ocupacionAmbiente: Set<string>;
    restricciones: Restricciones;
    modoPrueba: boolean;
  }): DocenteCandidato['docente'] | null {
    let mejor: { docente: DocenteCandidato['docente']; puntaje: number } | null = null;
    let mejorCobertura = 0;

    for (const candidato of params.candidatos) {
      const simulacion = await this.simularBloques({
        periodoId: 0,
        curso: params.curso,
        grupoId: params.grupoId,
        componente: params.componente,
        docenteId: candidato.docente.id,
        horasDisponibles: params.horasDisponibles,
        ambientes: params.ambientes,
        disponibilidadDocenteMapa: params.disponibilidadDocenteMapa,
        disponibilidadAmbienteMapa: params.disponibilidadAmbienteMapa,
        ocupacionDocente: params.ocupacionDocente,
        ocupacionAmbiente: params.ocupacionAmbiente,
        restricciones: params.restricciones,
        modoPrueba: params.modoPrueba,
        grupo: params.grupoId ? await prisma.grupo.findUnique({ where: { id: params.grupoId } }) : null,
      });

      if (simulacion.bloques.length === 0) continue;

      const cobertura = simulacion.bloques.length;
      const puntaje = simulacion.puntajeTotal;
      if (!mejor || cobertura > mejorCobertura || (cobertura === mejorCobertura && puntaje > mejor.puntaje)) {
        mejor = { docente: candidato.docente, puntaje };
        mejorCobertura = cobertura;
      }
    }

    return mejor?.docente ?? null;
  }

  private static async armarBloquesParaGrupo(params: {
    periodoId: number;
    curso: DocenteCandidato['curso'];
    grupoId: number | null;
    componente: CursoComponent;
    docenteId: number;
    horasDisponibles: string[];
    ambientes: AmbienteDisponible[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocente: Set<string>;
    ocupacionAmbiente: Set<string>;
    restricciones: Restricciones;
    modoPrueba: boolean;
  }): Promise<{ bloques: BloqueGenerado[]; puntajeTotal: number }> {
    return this.simularBloques({ ...params, periodoId: params.periodoId });
  }

  private static async simularBloques(params: {
    periodoId: number;
    curso: DocenteCandidato['curso'];
    grupoId: number | null;
    grupo?: { capacidad_maxima: number } | null;
    componente: CursoComponent;
    docenteId: number;
    horasDisponibles: string[];
    ambientes: AmbienteDisponible[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocente: Set<string>;
    ocupacionAmbiente: Set<string>;
    restricciones: Restricciones;
    modoPrueba: boolean;
  }): Promise<{ bloques: BloqueGenerado[]; puntajeTotal: number }> {
    const bloques: BloqueGenerado[] = [];
    const puntajeUsado = new Set<string>();
    let puntajeTotal = 0;

    const ambientesPermitidosPorCurso = params.curso.ambientes
      .filter((relacion) => relacion.tipo_clase === params.componente.tipo)
      .map((relacion) => relacion.ambiente.id);
    const ambientesCompatibles = params.ambientes.filter((ambiente) => {
      const coincideTipo = PREFIJOS_AMBIENTE[params.componente.tipo].some((prefijo) => ambiente.tipo === prefijo);
      const coincideCurso = ambientesPermitidosPorCurso.length === 0 || ambientesPermitidosPorCurso.includes(ambiente.id);
      return coincideTipo && coincideCurso;
    });

    const cargaDiaria = new Map<string, number>();
    const grupo = params.grupoId
      ? await prisma.grupo.findUnique({ where: { id: params.grupoId } })
      : null;
    let referenciaAnterior: { dia: string; hora: string; ambienteId: number } | null = null;

    for (let indice = 0; indice < params.componente.horas; indice++) {
      const candidatosSlots = this.evaluarSlots({
        docenteId: params.docenteId,
        ambientes: ambientesCompatibles,
        horasDisponibles: params.horasDisponibles,
        disponibilidadDocenteMapa: params.disponibilidadDocenteMapa,
        disponibilidadAmbienteMapa: params.disponibilidadAmbienteMapa,
        ocupacionDocente: params.ocupacionDocente,
        ocupacionAmbiente: params.ocupacionAmbiente,
        restricciones: params.restricciones,
        modoPrueba: params.modoPrueba,
        cargaDiaria,
        referenciaAnterior,
        tipoClase: params.componente.tipo,
        grupo: params.grupo ?? null,
      });

      if (candidatosSlots.length === 0) break;

      const mejorSlot = candidatosSlots[0];
      const horaFin = this.sumarUnaHora(mejorSlot.hora);

      bloques.push({
        id_periodo: params.periodoId,
        id_docente: params.docenteId,
        id_curso: params.curso.id,
        id_grupo: params.grupoId,
        id_ambiente: mejorSlot.ambiente.id,
        tipo_clase: params.componente.tipo,
        dia_semana: mejorSlot.dia,
        hora_inicio: mejorSlot.hora,
        hora_fin: horaFin,
        estado: 'BORRADOR',
      });

      puntajeTotal += mejorSlot.puntaje;
      puntajeUsado.add(`${mejorSlot.dia}|${mejorSlot.hora}|${mejorSlot.ambiente.id}`);
      cargaDiaria.set(mejorSlot.dia, (cargaDiaria.get(mejorSlot.dia) || 0) + 1);
      referenciaAnterior = { dia: mejorSlot.dia, hora: mejorSlot.hora, ambienteId: mejorSlot.ambiente.id };

      if (puntajeUsado.size !== indice + 1) break;
    }

    return { bloques, puntajeTotal };
  }

  private static evaluarSlots(params: {
    docenteId: number;
    ambientes: AmbienteDisponible[];
    horasDisponibles: string[];
    disponibilidadDocenteMapa: Map<string, boolean>;
    disponibilidadAmbienteMapa: Map<string, boolean>;
    ocupacionDocente: Set<string>;
    ocupacionAmbiente: Set<string>;
    restricciones: Restricciones;
    modoPrueba: boolean;
    cargaDiaria: Map<string, number>;
    referenciaAnterior: { dia: string; hora: string; ambienteId: number } | null;
    grupo: { capacidad_maxima: number } | null;
    tipoClase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  }): SlotEvaluado[] {
    const slots: SlotEvaluado[] = [];

    for (const dia of DIAS) {
      for (const hora of params.horasDisponibles) {
        const docenteLibre = this.slotDisponibleDocente(params.docenteId, dia, hora, params.disponibilidadDocenteMapa, params.ocupacionDocente);
        if (!docenteLibre) continue;

        const cargaDia = params.cargaDiaria.get(dia) || 0;
        if (cargaDia >= params.restricciones.horasMaximasDiarias) continue;

        for (const ambiente of params.ambientes) {
          if (!params.modoPrueba && params.grupo && params.grupo.capacidad_maxima > ambiente.capacidad) continue;
          const ambienteLibre = this.slotDisponibleAmbiente(ambiente.id, dia, hora, params.disponibilidadAmbienteMapa, params.ocupacionAmbiente);
          if (!ambienteLibre) continue;

          const puntaje = this.calcularPuntajeSlot({
            dia,
            hora,
            ambiente,
            referenciaAnterior: params.referenciaAnterior,
            tipoClase: params.tipoClase,
          });

          slots.push({ dia, hora, ambiente, puntaje });
        }
      }
    }

    slots.sort((a, b) => b.puntaje - a.puntaje || a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora));
    return slots;
  }

  private static calcularPuntajeSlot(params: {
    dia: string;
    hora: string;
    ambiente: AmbienteDisponible;
    referenciaAnterior: { dia: string; hora: string; ambienteId: number } | null;
    tipoClase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  }) {
    const diaIndex = DIAS.indexOf(params.dia as (typeof DIAS)[number]);
    const horaIndex = parseInt(params.hora.slice(0, 2), 10) - 7;
    let puntaje = 100 - diaIndex * 8 - horaIndex * 2;

    if (params.referenciaAnterior) {
      const mismaDia = params.referenciaAnterior.dia === params.dia;
      const horaAnterior = parseInt(params.referenciaAnterior.hora.slice(0, 2), 10);
      const horaActual = parseInt(params.hora.slice(0, 2), 10);
      const consecutivo = mismaDia && horaActual === horaAnterior + 1;
      const mismoAmbiente = params.referenciaAnterior.ambienteId === params.ambiente.id;

      if (consecutivo) puntaje += 70;
      if (mismaDia) puntaje += 25;
      if (mismoAmbiente) puntaje += 30;
      if (params.tipoClase === 'TEORIA' && params.ambiente.tipo === 'AULA') puntaje += 15;
      if (params.tipoClase === 'PRACTICA' && params.ambiente.tipo === 'AULA') puntaje += 20;
      if (params.tipoClase === 'LABORATORIO' && params.ambiente.tipo === 'LABORATORIO') puntaje += 25;
    } else {
      if (params.tipoClase === 'LABORATORIO' && params.ambiente.tipo === 'LABORATORIO') puntaje += 20;
      if (params.tipoClase !== 'LABORATORIO' && params.ambiente.tipo === 'AULA') puntaje += 10;
    }

    return puntaje;
  }

  private static crearMapaDisponibilidad(items: DisponibilidadSlot[]) {
    const mapa = new Map<string, boolean>();
    for (const item of items) {
      const id = item.id_docente ?? item.id_ambiente;
      if (id == null) continue;
      mapa.set(`${id}|${item.dia_semana}|${item.hora_inicio}`, item.disponible);
    }
    return mapa;
  }

  private static slotDisponibleDocente(
    idDocente: number,
    dia: string,
    hora: string,
    disponibilidad: Map<string, boolean>,
    ocupacion: Set<string>
  ) {
    const clave = `${idDocente}|${dia}|${hora}`;
    const disponibleDeclarado = disponibilidad.size === 0 ? true : disponibilidad.get(`${idDocente}|${dia}|${hora}`) ?? false;
    return disponibleDeclarado && !ocupacion.has(clave);
  }

  private static slotDisponibleAmbiente(
    idAmbiente: number,
    dia: string,
    hora: string,
    disponibilidad: Map<string, boolean>,
    ocupacion: Set<string>
  ) {
    const clave = `${idAmbiente}|${dia}|${hora}`;
    const disponibleDeclarado = disponibilidad.size === 0 ? true : disponibilidad.get(`${idAmbiente}|${dia}|${hora}`) ?? false;
    return disponibleDeclarado && !ocupacion.has(clave);
  }

  private static async obtenerRestricciones(idPeriodo: number): Promise<Restricciones> {
    const configs = await prisma.configuracion.findMany({ where: { id_periodo: idPeriodo } });
    const mapa: Record<string, string> = {};
    for (const c of configs) mapa[c.clave] = c.valor;
    return {
      franjaInicio: mapa.FRANJA_INICIO || '07:00',
      franjaFin: mapa.FRANJA_FIN || '22:00',
      horasMaximasDiarias: parseInt(mapa.HORAS_MAX_DIARIAS || '8', 10),
      bloqueoAlmuerzoInicio: mapa.BLOQUEO_ALMUERZO_INICIO || '13:00',
      bloqueoAlmuerzoFin: mapa.BLOQUEO_ALMUERZO_FIN || '15:00',
    };
  }

  private static generarHoras(inicio: string, fin: string): string[] {
    const [horaInicio] = inicio.split(':').map(Number);
    const [horaFin] = fin.split(':').map(Number);
    const horas: string[] = [];
    for (let hora = horaInicio; hora < horaFin; hora++) {
      horas.push(`${String(hora).padStart(2, '0')}:00`);
    }
    return horas;
  }

  private static estaEnBloqueoAlmuerzo(hora: string, restricciones: Restricciones) {
    return hora >= restricciones.bloqueoAlmuerzoInicio && hora < restricciones.bloqueoAlmuerzoFin;
  }

  private static sumarUnaHora(hora: string) {
    const valor = parseInt(hora.slice(0, 2), 10) + 1;
    return `${String(valor).padStart(2, '0')}:00`;
  }
}
