import {
  BloqueHorarioReporteCiclo,
  ContextoHorarioCiclo,
  EntradaCeldaHorarioCiclo,
  RegistroHorarioCiclo,
} from './reportes.types';

const COLORES_PASTEL = [
  'FFF9E795', // Amarillo claro
  'FFE6F2FF', // Azul claro
  'FFD5E8D4', // Verde claro
  'FFD9EAD3', // Verde más claro
  'FFEAD1DC', // Rosado claro
  'FFF2DDDC', // Naranja claro
  'FFDDD9C3', // Beige claro
  'FFD4E4F7', // Azul más claro
  'FFFCE4CD', // Naranja más claro
  'FFE5E0EC', // Morado claro
  'FFF5F0E6', // Arena claro
  'FFE6EAF2', // Gris azulado claro
];

const DEPARTAMENTO_FIJO = 'Ing. de Sistemas';

export function obtenerColorCurso(indiceCurso: number): string {
  return COLORES_PASTEL[(indiceCurso - 1) % COLORES_PASTEL.length];
}

export function obtenerDuracionHoras(horaInicio: string, horaFin: string): number {
  const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
  const [finHoras, finMinutos] = horaFin.split(':').map(Number);
  const minutos = (finHoras * 60 + finMinutos) - (inicioHoras * 60 + inicioMinutos);
  return Math.max(1, minutos / 60);
}

export function formatearDocente(docente: BloqueHorarioReporteCiclo['docente']): string {
  return `${docente.apellidos}, ${docente.nombres}`;
}

export function formatearEtiquetaCelda(registro: RegistroHorarioCiclo, bloque: BloqueHorarioReporteCiclo): string {
  const grupoEtiqueta = registro.tieneMultiplesGrupos ? `Gr. ${registro.grupoCodigo}` : '';
  const ambienteEtiqueta = bloque.ambiente?.codigo || 'Solic.';
  return [registro.indice, grupoEtiqueta, ambienteEtiqueta].filter(Boolean).join('\n');
}

export function crearContextoHorarioCiclo(bloques: BloqueHorarioReporteCiclo[]): ContextoHorarioCiclo {
  const registros = new Map<string, RegistroHorarioCiclo & { gruposSet: Set<string> }>();
  const gruposPorCurso = new Map<number, Set<string>>();
  const coloresPorCurso = new Map<number, string>();
  const celdas = new Map<string, EntradaCeldaHorarioCiclo[]>();

  let siguienteIndice = 1;

  for (const bloque of bloques) {
    const cursoId = bloque.componente.oferta.id_curso;
    const grupoCodigo = bloque.grupo?.codigo?.trim() || 'UNICO';
    const docenteNombre = formatearDocente(bloque.docente);
    // Agrupamos por curso y docente solamente (eliminamos grupoCodigo de la clave)
    const key = `${cursoId}-${bloque.id_docente}`;

    if (!coloresPorCurso.has(cursoId)) {
      coloresPorCurso.set(cursoId, obtenerColorCurso(coloresPorCurso.size + 1));
    }

    const gruposCurso = gruposPorCurso.get(cursoId) ?? new Set<string>();
    gruposCurso.add(grupoCodigo);
    gruposPorCurso.set(cursoId, gruposCurso);

    let registro = registros.get(key);
    if (!registro) {
      registro = {
        indice: siguienteIndice++,
        color: coloresPorCurso.get(cursoId) ?? obtenerColorCurso(1),
        cursoId,
        cursoNombre: bloque.componente.oferta.curso.nombre,
        docenteNombre,
        grupoCodigo: '', // Se llenará al final
        grupoId: bloque.grupo.id,
        teoria: 0,
        practica: 0,
        laboratorio: 0,
        totalHoras: 0,
        departamento: DEPARTAMENTO_FIJO,
        tieneMultiplesGrupos: false,
        gruposSet: new Set<string>()
      };
      registros.set(key, registro);
    }

    registro.gruposSet.add(grupoCodigo);

    const horas = obtenerDuracionHoras(bloque.hora_inicio, bloque.hora_fin);
    if (bloque.componente.tipo === 'TEORIA') registro.teoria += horas;
    if (bloque.componente.tipo === 'PRACTICA') registro.practica += horas;
    if (bloque.componente.tipo === 'LABORATORIO') registro.laboratorio += horas;
    registro.totalHoras += horas;

    const celdaKey = `${bloque.dia_semana}-${bloque.hora_inicio}`;
    const entradas = celdas.get(celdaKey) ?? [];
    entradas.push({ registro, bloque });
    celdas.set(celdaKey, entradas);
  }

  const registrosOrdenados = [...registros.values()]
    .sort((a, b) => a.indice - b.indice)
    .map(reg => {
      // Formatear los códigos de grupo (ej: "A, B" o "UNICO")
      const gruposArr = Array.from(reg.gruposSet).sort();
      reg.grupoCodigo = gruposArr.join(', ');
      reg.tieneMultiplesGrupos = gruposArr.length > 1;
      return reg;
    });

  const celdasOrdenadas: Record<string, EntradaCeldaHorarioCiclo[]> = {};

  for (const [clave, entradas] of celdas.entries()) {
    celdasOrdenadas[clave] = entradas.sort((a, b) => a.registro.indice - b.registro.indice);
  }

  return {
    registros: registrosOrdenados,
    celdas: celdasOrdenadas,
  };
}