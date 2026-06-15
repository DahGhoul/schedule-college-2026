import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BloqueHorario = {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  origen?: string;
  seccion?: string;
  curso_nombre?: string;
  ambiente?: string;
  tipo_componente?: string; // TEORIA, PRACTICA, LABORATORIO
};

type Props = {
  data: any;
  isSedeCentral: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DIA_ABREV: Record<string, string> = {
  LUNES: 'LU',
  MARTES: 'MA',
  MIERCOLES: 'MI',
  JUEVES: 'JU',
  VIERNES: 'VI',
  SABADO: 'SA',
};

const DIAS_ORDER = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

const SECCION_LABEL: Record<string, string> = {
  PREPARACION_EVALUACION: 'PREPARACION Y EVALUACION',
  CONSEJERIA_TUTORIA: 'TUTORIA Y CONSEJERIA',
  INVESTIGACION: 'INVESTIGACION',
  CAPACITACION: 'FORMACION ACADEMICA Y CAPACITACION',
  ACTIVIDADES_GOBIERNO: 'ACTIVIDADES DE GOBIERNO O AUTORIDAD',
  ACTIVIDADES_ADMINISTRACION: 'ACTIVIDADES DE GESTION INSTITUCIONAL',
  ASESORIA_TESIS: 'ASESORIA DE TESIS Y EXAMENES PROFESIONALES',
  RESPONSABILIDAD_SOCIAL: 'RESPONSABILIDAD SOCIAL UNIVERSITARIA',
  COMITES_COMISIONES: 'COMITES O COMISIONES ESPECIALES',
};

const SECCIONES_ORDER = [
  'PREPARACION_EVALUACION',
  'CONSEJERIA_TUTORIA',
  'INVESTIGACION',
  'RESPONSABILIDAD_SOCIAL',
  'ASESORIA_TESIS',
  'CAPACITACION',
  'ACTIVIDADES_GOBIERNO',
  'ACTIVIDADES_ADMINISTRACION',
  'COMITES_COMISIONES',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatHora = (hora: string) => hora?.substring(0, 5) ?? '';

const mergeBloques = (bloques: BloqueHorario[]): BloqueHorario[] => {
  if (!bloques.length) return [];
  const sorted = [...bloques].sort((a, b) => {
    const da = DIAS_ORDER.indexOf(a.dia_semana);
    const db = DIAS_ORDER.indexOf(b.dia_semana);
    if (da !== db) return da - db;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });

  const merged: BloqueHorario[] = [];
  for (const bloque of sorted) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.dia_semana === bloque.dia_semana &&
      last.origen === bloque.origen &&
      last.seccion === bloque.seccion &&
      last.tipo_componente === bloque.tipo_componente &&
      last.hora_fin === bloque.hora_inicio
    ) {
      last.hora_fin = bloque.hora_fin;
    } else {
      merged.push({ ...bloque });
    }
  }
  return merged;
};

const diffHoras = (inicio: string, fin: string): number => {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  return (hf * 60 + mf - hi * 60 - mi) / 60;
};

/**
 * Formatea una fecha ISO o Date de Prisma a DD/MM/YYYY sin desfase de zona horaria.
 * Prisma devuelve DateTime @db.Date como "2026-03-16T00:00:00.000Z".
 * Tomamos directamente la parte de fecha del string para evitar el problema UTC→local.
 */
const formatFechaPeriodo = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return '';
  // Si viene como string ISO, tomamos solo los primeros 10 caracteres (YYYY-MM-DD)
  const iso = fecha instanceof Date ? fecha.toISOString() : String(fecha);
  const partes = iso.substring(0, 10).split('-'); // ['YYYY', 'MM', 'DD']
  if (partes.length !== 3) return '';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

/**
 * Construye el string de horario lectivo por curso.
 *
 * Regla de negocio:
 *   T (primera línea) = bloques de TEORIA + bloques de PRACTICA combinados
 *   P (segunda línea) = bloques de LABORATORIO únicamente
 *
 * Si no hay laboratorio, solo se muestra la línea T.
 * Si no hay teoría ni práctica pero sí laboratorio, T queda vacío y P muestra el laboratorio.
 */
const construirHorarioLectivo = (
  bloques: BloqueHorario[]
): { horario: string; lugar: string; aula: string; total: number } => {
  const bloquesT = bloques.filter(
    (b) => b.tipo_componente === 'TEORIA' || b.tipo_componente === 'PRACTICA'
  );
  const bloquesP = bloques.filter((b) => b.tipo_componente === 'LABORATORIO');

  const ordenarSlots = (bs: BloqueHorario[]) =>
    [...bs]
      .sort((a, b) => {
        const da = DIAS_ORDER.indexOf(a.dia_semana);
        const db = DIAS_ORDER.indexOf(b.dia_semana);
        if (da !== db) return da - db;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      })
      .map((b) => `${DIA_ABREV[b.dia_semana]}(${formatHora(b.hora_inicio)}-${formatHora(b.hora_fin)})`)
      .join(', ');

  const lineas: string[] = [];
  if (bloquesT.length > 0) {
    lineas.push(`T: ${ordenarSlots(bloquesT)}`);
  }
  if (bloquesP.length > 0) {
    lineas.push(`P: ${ordenarSlots(bloquesP)}`);
  }

  const total = bloques.reduce((acc, b) => acc + diffHoras(b.hora_inicio, b.hora_fin), 0);
  const aulas = [...new Set(bloques.map((b) => b.ambiente).filter(Boolean))].join(', ') || '';

  return {
    horario: lineas.join('\n'),
    lugar: 'F11',
    aula: aulas,
    total,
  };
};

const construirHorarioNoLectivo = (bloques: BloqueHorario[]): string => {
  return bloques
    .map((b) => `${DIA_ABREV[b.dia_semana]}(${formatHora(b.hora_inicio)}-${formatHora(b.hora_fin)})`)
    .join(', \n');
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Formato3: React.FC<Props> = ({ data, isSedeCentral }) => {
  const { docente, declaracion } = data;

  const dateObj = new Date();
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const fechaHoy = `Trujillo, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]} del ${dateObj.getFullYear()}`;

  // ── Lectivos ──────────────────────────────────────────────────────────────
  const lectivosRaw: any[] = data.horario?.lectivos ?? [];

  const lectivosEnriquecidos: BloqueHorario[] = lectivosRaw.map((b: any) => ({
    dia_semana: b.dia_semana,
    hora_inicio: formatHora(b.hora_inicio),
    hora_fin: formatHora(b.hora_fin),
    origen: b.curso_nombre || b.origen || '',
    ambiente: b.ambiente || 'F11',
    tipo_componente: b.tipo_componente ?? 'TEORIA',
  }));

  const lectivosMerged = mergeBloques(lectivosEnriquecidos);

  // Agrupar por curso (origen)
  const cursoMap = new Map<string, BloqueHorario[]>();
  for (const b of lectivosMerged) {
    const key = b.origen ?? '';
    if (!cursoMap.has(key)) cursoMap.set(key, []);
    cursoMap.get(key)!.push(b);
  }

  const filasLectivas = Array.from(cursoMap.entries()).map(([curso, bloques]) => ({
    curso,
    ...construirHorarioLectivo(bloques),
  }));

  // Detectar si hay laboratorio en uso para saber si mostrar filas vacías
  const tieneTeoriaPractica = lectivosMerged.some(
    (b) => b.tipo_componente === 'TEORIA' || b.tipo_componente === 'PRACTICA'
  );
  const tieneLaboratorio = lectivosMerged.some((b) => b.tipo_componente === 'LABORATORIO');

  const totalHorasLectivas = filasLectivas.reduce((acc, f) => acc + f.total, 0);

  // ── No lectivos ────────────────────────────────────────────────────────────
  const noLectivosRaw: any[] = data.horario?.no_lectivos ?? [];

  const noLectivosMerged = mergeBloques(
    noLectivosRaw.map((b: any) => ({
      dia_semana: b.dia_semana,
      hora_inicio: formatHora(b.hora_inicio),
      hora_fin: formatHora(b.hora_fin),
      seccion: b.seccion,
      ambiente: b.ambiente || 'F11',
    }))
  );

  const seccionMap = new Map<string, BloqueHorario[]>();
  for (const b of noLectivosMerged) {
    const key = b.seccion ?? '';
    if (!seccionMap.has(key)) seccionMap.set(key, []);
    seccionMap.get(key)!.push(b);
  }

  const totalHorasNoLectivas = noLectivosMerged.reduce(
    (acc, b) => acc + diffHoras(b.hora_inicio, b.hora_fin),
    0
  );

  const totalHoras = Number(declaracion?.total_horas ?? totalHorasLectivas + totalHorasNoLectivas);

  // ── Datos institucionales ──────────────────────────────────────────────────
  const institucion = data.datos_institucionales ?? {};
  const facultad = institucion.facultad ?? 'Ingeniería';
  const dpto = institucion.departamento_academico ?? 'Ingeniería de Sistemas';

  // ── Período ────────────────────────────────────────────────────────────────
  // data.periodo viene del periodo_academico del schema de Prisma.
  // fecha_inicio y fecha_fin son DateTime @db.Date, Prisma los serializa como ISO string.
  const periodo = data.periodo ?? {};
  const anio = periodo.nombre?.split('-')[0] ?? new Date().getFullYear();
  const semestre = periodo.nombre?.split('-')[1] ?? 'I';
  const fechaInicio = formatFechaPeriodo(periodo.fecha_inicio);
  const fechaFin = formatFechaPeriodo(periodo.fecha_fin);

  // ── Docente ────────────────────────────────────────────────────────────────
  const dedicacionLabel: Record<string, string> = {
    TIEMPO_COMPLETO_40H: 'TC',
    DEDICACION_EXCLUSIVA_40H: 'DE',
    TIEMPO_PARCIAL_20H: 'TP',
    TIEMPO_PARCIAL_16H: 'TP',
    TIEMPO_PARCIAL_12H: 'TP',
    TIEMPO_PARCIAL_10H: 'TP',
    TIEMPO_PARCIAL_8H: 'TP',
  };
  const categoriaLabel: Record<string, string> = {
    PRINCIPAL: 'PRINCIPAL',
    ASOCIADO: 'ASOCIADO',
    AUXILIAR: 'AUXILIAR',
    JEFE_PRACTICA: 'JEFE DE PRÁCTICA',
    PROFESOR: 'PROFESOR',
  };
  const categoria = categoriaLabel[docente?.categoria ?? ''] ?? (docente?.categoria ?? '');
  const dedicacion = dedicacionLabel[docente?.dedicacion ?? ''] ?? '';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '11px',
        color: '#000',
        background: '#fff',
        width: '21cm',
        minHeight: '29.7cm',
        margin: '0 auto',
        padding: '1.5cm 1.8cm',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        * { font-family: 'Tinos', 'Times New Roman', Times, serif; box-sizing: border-box; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
        }
        .f3-table { border-collapse: collapse; width: 100%; margin-bottom: 0; }
        .f3-table td, .f3-table th {
          border: 1px solid #000;
          padding: 3px 5px;
          vertical-align: middle;
          line-height: 1.3;
        }
        .f3-bg-gray { background-color: #d9d9d9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .f3-bg-light { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .f3-text-center { text-align: center; }
        .f3-text-right { text-align: right; }
        .f3-bold { font-weight: bold; }
        .f3-pre { white-space: pre-line; }
      `}</style>

      {/* ── Título ── */}
      <div
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '13px',
          textTransform: 'uppercase',
          marginBottom: '8px',
          letterSpacing: '0.3px',
        }}
      >
        HORARIO SEMANAL DE LA CARGA ACADÉMICA DOCENTE (F03-CAD)
      </div>

      {/* ── Fila 1: Facultad / Dpto ── */}
      <table className="f3-table">
        <tbody>
          <tr>
            <td style={{ width: '50%' }}>
              <span className="f3-bold">Facultad / Filial: </span>
              {facultad}
            </td>
            <td style={{ width: '50%' }}>
              <span className="f3-bold">Dpto. Académico: </span>
              {dpto}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Fila 2: DNI / Docente / Categoría+Dedicación ── */}
      <table className="f3-table">
        <tbody>
          <tr>
            <td style={{ width: '12%' }} className="f3-bold f3-text-center">DNI</td>
            <td style={{ width: '13%' }} className="f3-text-center">{docente?.dni ?? ''}</td>
            <td style={{ width: '10%' }} className="f3-bold f3-text-center">Docente:</td>
            <td style={{ width: '45%' }}>
              <span className="f3-bold">
                {docente?.nombres ?? ''} {docente?.apellidos ?? ''}
              </span>
            </td>
            <td style={{ width: '20%' }} className="f3-text-center f3-bold">
              {categoria}<br />{dedicacion}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Fila 3: Año / Semestre / Fechas ── */}
      <table className="f3-table">
        <tbody>
          <tr className="f3-text-center f3-bg-light">
            <td colSpan={5}>
              <span className="f3-bold">AÑO ACADÉMICO: {anio}</span>
              {semestre && <>&nbsp;&nbsp;<span className="f3-bold">SEMESTRE: {semestre}</span></>}
              {fechaInicio && (
                <>&nbsp;&nbsp;<span className="f3-bold">Fecha de Inicio: {fechaInicio}</span></>
              )}
              {fechaFin && (
                <>&nbsp;&nbsp;<span className="f3-bold">Fecha de término: {fechaFin}</span></>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLA CARGA LECTIVA
      ══════════════════════════════════════════════════════════════════════ */}
      <table className="f3-table" style={{ marginTop: '0' }}>
        <thead>
          <tr className="f3-bg-gray">
            <th style={{ width: '27%' }} className="f3-text-center f3-bold">HORARIO</th>
            <th style={{ width: '36%' }} className="f3-text-center f3-bold">CARGA HORARIA LECTIVA (CHL)</th>
            <th style={{ width: '10%' }} className="f3-text-center f3-bold">LUGAR</th>
            <th style={{ width: '15%' }} className="f3-text-center f3-bold">AULA</th>
            <th style={{ width: '12%' }} className="f3-text-center f3-bold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {filasLectivas.length > 0
            ? filasLectivas.map((fila, idx) => (
                <tr key={idx}>
                  <td className="f3-pre" style={{ fontSize: '10px' }}>{fila.horario}</td>
                  <td>{fila.curso}</td>
                  <td className="f3-text-center">{fila.lugar}</td>
                  <td className="f3-text-center" style={{ fontSize: '10px' }}>{fila.aula}</td>
                  <td className="f3-text-center f3-bold">{fila.total > 0 ? fila.total : ''}</td>
                </tr>
              ))
            : null}

          {/* Filas vacías cuando no hay datos de ese tipo */}
          {!tieneTeoriaPractica && (
            <tr>
              <td style={{ fontSize: '10px' }}>T:</td>
              <td></td><td></td><td></td><td></td>
            </tr>
          )}
          {!tieneLaboratorio && (
            <tr>
              <td style={{ fontSize: '10px' }}>P:</td>
              <td></td><td></td><td></td><td></td>
            </tr>
          )}

          {/* Fila total CHL */}
          <tr className="f3-bg-light">
            <td colSpan={4} className="f3-text-right f3-bold" style={{ paddingRight: '8px' }}>T:</td>
            <td className="f3-text-center f3-bold">{totalHorasLectivas > 0 ? totalHorasLectivas : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLA CARGA NO LECTIVA
      ══════════════════════════════════════════════════════════════════════ */}
      <table className="f3-table">
        <thead>
          <tr className="f3-bg-gray">
            <th style={{ width: '27%' }} className="f3-text-center f3-bold">HORARIO</th>
            <th style={{ width: '36%' }} className="f3-text-center f3-bold">CARGA HORARIA NO LECTIVA (CHNL)</th>
            <th style={{ width: '10%' }} className="f3-text-center f3-bold">LUGAR</th>
            <th style={{ width: '15%' }} className="f3-text-center f3-bold">AULA</th>
            <th style={{ width: '12%' }} className="f3-text-center f3-bold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {SECCIONES_ORDER.map((seccion) => {
            const bloques = seccionMap.get(seccion) ?? [];
            const horarioStr = bloques.length > 0 ? construirHorarioNoLectivo(bloques) : '';
            const totalSec = bloques.reduce((acc, b) => acc + diffHoras(b.hora_inicio, b.hora_fin), 0);
            const lugar = bloques.length > 0 ? 'F11' : '';
            const aula = bloques.length > 0 ? 'CUBÍCULO' : '';

            return (
              <tr key={seccion}>
                <td className="f3-pre" style={{ fontSize: '10px' }}>{horarioStr}</td>
                <td>{SECCION_LABEL[seccion] ?? seccion}</td>
                <td className="f3-text-center">{lugar}</td>
                <td className="f3-text-center">{aula}</td>
                <td className="f3-text-center f3-bold">{totalSec > 0 ? totalSec : ''}</td>
              </tr>
            );
          })}

          {/* Fila total CHNL */}
          <tr className="f3-bg-light">
            <td colSpan={4} className="f3-text-right f3-bold" style={{ paddingRight: '8px' }}>T:</td>
            <td className="f3-text-center f3-bold">{totalHorasNoLectivas > 0 ? totalHorasNoLectivas : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Total General ── */}
      <table className="f3-table">
        <tbody>
          <tr className="f3-bg-gray">
            <td
              colSpan={4}
              className="f3-text-center f3-bold"
              style={{ fontSize: '12px', letterSpacing: '0.5px' }}
            >
              TOTAL HORAS CARGA ACADÉMICA
            </td>
            <td
              className="f3-text-center f3-bold"
              style={{ width: '12%', fontSize: '14px' }}
            >
              {totalHoras}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Leyenda ── */}
      <div style={{ fontSize: '9px', marginTop: '6px', lineHeight: '1.5' }}>
        <strong>T:</strong> TEORIA &nbsp; <strong>P:</strong> PRACTICA &nbsp; <strong>L:</strong> LABORATORIO
        <br />
        LU (LUNES); MA (MARTES); MI (MIERCOLES); JU (JUEVES); VI (VIERNES); SA (SABADO); TIEMPO EN FORMATO DE 24 HORAS.
        <br />
        <strong>LUGAR:</strong> (F01): "CC. Agropecuarias"; F02: "CC. Biológicas"; F03: "CC. Económicas"; F04: "CC. Físicas y Matemáticas"; F05: "CC. Sociales"; F06: "Derecho y Ciencias Políticas"; F07: "Educación y Comunicación"; F08: "Enfermería"; F09: "Farmacia y Bioquímica"; F10: "Ingeniería Química"; F11: "Ingeniería"; F12: "Medicina"; F13: "Odontología"; F14: "Filial Valle Jequetepeque"; F15: "Filial Huamachuco"; F16: "Filial Santiago de Chuco"; (OA): "Oficina Administrativa"; (SC): "Salida de Campo".
      </div>

      {/* ── Fecha ── */}
      <div style={{ textAlign: 'right', marginTop: '16px', marginBottom: '24px', fontSize: '11px' }}>
        {fechaHoy}
      </div>

      {/* ── Firmas ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {[
              'FIRMA DEL DOCENTE',
              'FIRMA Y SELLO DEL DIRECTOR DE DPTO. ACADÉMICO',
              'V°B° DECANO',
            ].map((label) => (
              <td
                key={label}
                style={{ width: '33.33%', textAlign: 'center', padding: '0 20px', fontSize: '11px', verticalAlign: 'bottom' }}
              >
                <div
                  style={{
                    borderTop: '1px solid #000',
                    width: '160px',
                    margin: '0 auto 4px auto',
                    paddingTop: '4px',
                  }}
                />
                <div className="f3-bold">{label}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};