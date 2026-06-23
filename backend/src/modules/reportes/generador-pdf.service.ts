import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import { crearContextoHorarioCiclo } from './horario-ciclo.utils';

const BORDER_COLOR = '#1A1A2E';
const HEADER_BG = '#E8E4F0';

// ────────────────────────────────────────────────────────────
// Sistema de paletas profesionales
// ────────────────────────────────────────────────────────────

/**
 * 32 colores claros y profesionales, visualmente distintos entre sí.
 * Inspirados en paletas de diseño editorial: lavandas, mints, cielos, rosas,
 * sages, melocotones, índigos suaves, ámbar, etc. Todos superan el contraste
 * necesario para texto negro sobre fondo claro.
 */
const PALETA_LECTIVA: string[] = [
  '#C9E4F5', // Celeste suave
  '#C5E8D3', // Mint fresco
  '#F5D7E3', // Rosa palo
  '#D4C9F0', // Lavanda
  '#FAE8C2', // Ámbar claro
  '#C2E8E8', // Turquesa suave
  '#F0D9C5', // Melocotón
  '#D1EAC5', // Verde sage
  '#E8C9E4', // Malva claro
  '#C5D4F0', // Azul pizarra suave
  '#F5F0C2', // Lima pálido
  '#F0C5C5', // Coral suave
  '#C5E4D4', // Seafoam
  '#E4D4C5', // Arena cálida
  '#D4E8C2', // Pistacho
  '#C5C9E8', // Perivenio
  '#F0E4C5', // Crema dorada
  '#E4C5D4', // Frambuesa suave
  '#C5E8E4', // Aqua pálido
  '#D8C5F0', // Violeta claro
  '#E8D4C2', // Tostado suave
  '#C2D8E8', // Denim suave
  '#F5E4C5', // Vainilla
  '#C8E4C5', // Eucalipto
  '#F0C8D4', // Peonía suave
  '#C5D8D4', // Grisáceo menta
  '#E8E4C2', // Mostaza pálida
  '#D4C5E8', // Orquídea suave
  '#C5E4E8', // Cielo invierno
  '#F0D4C5', // Salmón claro
  '#D4E4C5', // Helecho pálido
  '#E4C5C5', // Rosa empolvado
];

/**
 * 20 colores para carga no-lectiva: distintos entre sí y claramente
 * diferenciados del rango lectivo. Tonos más cálidos/neutros.
 */
const PALETA_NO_LECTIVA: string[] = [
  '#FFE5A0', // Amarillo suave
  '#FFD0A8', // Naranja claro
  '#FFDBC5', // Durazno
  '#F5D5A0', // Ocre claro
  '#FFE0C8', // Albaricoque
  '#F5E8A0', // Limón pálido
  '#FFDAB5', // Mandarina suave
  '#F0D890', // Miel pálida
  '#FFD8B0', // Papaya claro
  '#F5C8A8', // Terracota suave
  '#FFE8B0', // Trigo
  '#F5D0B0', // Bisque
  '#FFD5C0', // Melón suave
  '#F0E0A0', // Champagne
  '#FFD0B8', // Coral claro
  '#F5E0B0', // Crema caliente
  '#FFD8A0', // Sol suave
  '#F0D0A8', // Caramelo claro
  '#FFE0B0', // Vainilla cálida
  '#F5D8C0', // Piel suave
];

/** Devuelve el color lectivo para el índice dado (1-based), garantizando unicidad cíclica */
function obtenerColorLectivo(index: number): string {
  return PALETA_LECTIVA[(index - 1) % PALETA_LECTIVA.length];
}

/** Devuelve el color no-lectivo para el índice dado (0-based) */
function obtenerColorNoLectiva(index: number): string {
  return PALETA_NO_LECTIVA[index % PALETA_NO_LECTIVA.length];
}

const NO_LECTIVA_BG = PALETA_NO_LECTIVA[0];

/**
 * Construye un Map<indice, colorHex> para los registros del contexto,
 * usando nuestra paleta propia. No muta el objeto externo tipado.
 */
function construirMapaColoresLectivos(contexto: any): Map<number, string> {
  const mapa = new Map<number, string>();
  (contexto.registros as any[]).forEach((reg, idx) => {
    mapa.set(reg.indice, obtenerColorLectivo(idx + 1));
  });
  return mapa;
}

// ────────────────────────────────────────────────────────────
// Helpers de formato
// ────────────────────────────────────────────────────────────

function formatearFranjaHora(horaInicio: string): string {
  const [horas, minutos] = horaInicio.split(':');
  const horaFinal = String(Number(horas) + 1).padStart(2, '0');
  return `${Number(horas)}:${minutos} - ${Number(horaFinal)}:${minutos}`;
}

function obtenerClaveFusionPdf(bloque: any): string {
  return `${bloque.dia_semana}-${bloque.id_docente}-${bloque.componente.id_oferta}-${bloque.componente.tipo}-${bloque.grupo?.id ?? ''}-${bloque.id_ambiente ?? ''}`;
}

function obtenerClaveNoLectiva(bloque: any): string {
  return `${bloque.dia_semana}-${bloque.seccion}-${bloque.id_docente}`;
}

function formatearEtiquetaCeldaPdf(
  registro: any,
  bloque: any,
  esHorarioDocente = false
): string {
  let cursoNombre = '';
  const nombre = registro?.nombre || bloque?.componente?.oferta?.curso?.nombre || '';
  if (nombre) {
    const palabras = nombre.split(' ');
    cursoNombre = palabras.length > 3
      ? palabras.map((p: string) => p.charAt(0).toUpperCase()).join('')
      : nombre;
  }

  if (esHorarioDocente) {
    const cicloNumero = bloque?.componente?.oferta?.ciclo?.numero;
    const cicloEtiqueta = cicloNumero ? `${cicloNumero}°` : '';
    const tipoEtiqueta = bloque?.componente?.tipo ? bloque.componente.tipo.substring(0, 3) : '';
    const ambienteEtiqueta = bloque?.ambiente?.codigo || 'Solic.';
    return [String(registro?.indice || ''), cicloEtiqueta, tipoEtiqueta, ambienteEtiqueta]
      .filter(Boolean).join('\n');
  }

  if (!registro) return cursoNombre;

  const ambienteEtiqueta = bloque?.ambiente?.codigo || 'Solic.';
  return [String(registro.indice), ambienteEtiqueta].filter(Boolean).join('\n');
}

function calcularFusionPdf(
  contexto: Record<string, Array<{ bloque: any }>>,
  dia: string,
  horaIndex: number,
  horas: string[],
  bloque: any
): number {
  const clave = obtenerClaveFusionPdf(bloque);
  let span = 1;
  for (let sig = horaIndex + 1; sig < horas.length; sig++) {
    const entradas = contexto[`${dia}-${horas[sig]}`] ?? [];
    if (entradas.length !== 1) break;
    const sigBloque = 'bloque' in entradas[0] ? entradas[0].bloque : entradas[0];
    if (obtenerClaveFusionPdf(sigBloque) !== clave) break;
    span++;
  }
  return span;
}

function calcularFusionNoLectiva(
  bloques: any[],
  dia: string,
  horaIndex: number,
  horas: string[],
  bloque: any
): number {
  const clave = obtenerClaveNoLectiva(bloque);
  let span = 1;
  for (let sig = horaIndex + 1; sig < horas.length; sig++) {
    const siguiente = bloques.find(
      b => b.dia_semana === dia && b.hora_inicio === horas[sig] && obtenerClaveNoLectiva(b) === clave
    );
    if (!siguiente) break;
    span++;
  }
  return span;
}

// ────────────────────────────────────────────────────────────
// Caja de cabecera (info periodo / docente / ciclo)
// ────────────────────────────────────────────────────────────

function dibujarCajaInfoPeriodo(
  doc: PDFDocumentWithTable,
  leftColX: number,
  topMargin: number,
  width: number,
  height: number,
  lineas: string[]
) {
  doc.roundedRect(leftColX - 6, topMargin - 6, width, height, 4).stroke(BORDER_COLOR);
  const lineHeight = Math.max(10, Math.floor((height - 20) / Math.max(lineas.length, 1)));
  lineas.forEach((linea, index) => {
    const y = topMargin + index * lineHeight;
    doc
      .fontSize(index === 0 ? 10 : 8)
      .font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .text(linea, leftColX, y, { width: width - 12, align: 'center' });
  });
}

// ────────────────────────────────────────────────────────────
// Rejilla base (sin bloques)
// ────────────────────────────────────────────────────────────

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const HORAS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00',
];

function dibujarRejillaBase(
  doc: PDFDocumentWithTable,
  leftColX: number,
  horarioTop: number,
  gridColWidth: number,
  gridRowHeight: number
) {
  doc.font('Helvetica-Bold').fontSize(8);
  doc.rect(leftColX, horarioTop, gridColWidth, 15).fillAndStroke('#FFFFFF', BORDER_COLOR);
  doc.fillColor('black').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });

  DIAS.forEach((dia, i) => {
    const x = leftColX + (i + 1) * gridColWidth;
    doc.rect(x, horarioTop, gridColWidth, 15).fillAndStroke('#FFFFFF', BORDER_COLOR);
    doc.fillColor('black').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
  });

  let y = horarioTop + 15;
  doc.lineWidth(1);
  HORAS.forEach(hora => {
    doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
    doc.fillColor('black').font('Helvetica-Bold').fontSize(7)
      .text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });
    DIAS.forEach((_, dIdx) => {
      const x = leftColX + (dIdx + 1) * gridColWidth;
      doc.rect(x, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
    });
    y += gridRowHeight;
  });
}

// ────────────────────────────────────────────────────────────
// Dibujar bloque lectivo en el horario
// ────────────────────────────────────────────────────────────

function dibujarBloquesCiclo(
  doc: PDFDocumentWithTable,
  contexto: any,
  mapaColores: Map<number, string>,
  leftColX: number,
  horarioTop: number,
  gridColWidth: number,
  gridRowHeight: number
) {
  let y = horarioTop + 15;
  const slotsOcupados = new Set<string>();

  HORAS.forEach((hora, horaIndex) => {
    DIAS.forEach((dia, dIdx) => {
      const x = leftColX + (dIdx + 1) * gridColWidth;
      const slotKey = `${dia}-${hora}`;
      if (slotsOcupados.has(slotKey)) return;

      const entradas = contexto.celdas[slotKey] ?? [];
      if (entradas.length === 0) return;

      let span = 1;
      if (entradas.length === 1) {
        span = calcularFusionPdf(contexto.celdas, dia, horaIndex, HORAS, entradas[0].bloque);
      }
      const altoCelda = gridRowHeight * span;
      const blockWidth = gridColWidth / entradas.length;

      entradas.forEach((celda: any, idx: number) => {
        const blockLeft = x + idx * blockWidth;
        const colorHex = mapaColores.get(celda.registro.indice) ?? obtenerColorLectivo(celda.registro.indice ?? 1);
        doc.rect(blockLeft, y, blockWidth, altoCelda).fillAndStroke(colorHex, BORDER_COLOR);
        const texto = formatearEtiquetaCeldaPdf(celda.registro, celda.bloque);
        const textoY = y + altoCelda / 2 - 10;
        doc.fillColor('black').font('Helvetica-Bold').fontSize(5)
          .text(texto, blockLeft + 2, textoY, {
            width: blockWidth - 4,
            align: 'center',
            lineBreak: true,
            height: altoCelda - 4,
            ellipsis: false,
          });
      });

      for (let offset = 1; offset < span; offset++) {
        slotsOcupados.add(`${dia}-${HORAS[horaIndex + offset]}`);
      }
    });
    y += gridRowHeight;
  });
}

// ────────────────────────────────────────────────────────────
// Dibujar bloques lectivos de docente en el horario
// ────────────────────────────────────────────────────────────

function dibujarBloquesDocente(
  doc: PDFDocumentWithTable,
  bloques: any[],
  contexto: any,
  mapaColores: Map<number, string>,
  leftColX: number,
  horarioTop: number,
  gridColWidth: number,
  gridRowHeight: number,
  slotsOcupados: Set<string>
) {
  let y = horarioTop + 15;

  HORAS.forEach((hora, horaIndex) => {
    DIAS.forEach((dia, dIdx) => {
      const x = leftColX + (dIdx + 1) * gridColWidth;
      const slotKey = `${dia}-${hora}`;
      if (slotsOcupados.has(slotKey)) return;

      const slotEntries = bloques.filter(b => b.dia_semana === dia && b.hora_inicio === hora);
      if (slotEntries.length === 0) return;

      let span = 1;
      if (slotEntries.length === 1) {
        let ci = horaIndex;
        while (ci + 1 < HORAS.length) {
          const next = bloques.find(b =>
            b.dia_semana === dia &&
            b.hora_inicio === HORAS[ci + 1] &&
            b.id_componente === slotEntries[0].id_componente &&
            b.id_grupo === slotEntries[0].id_grupo &&
            b.id_ambiente === slotEntries[0].id_ambiente
          );
          if (next) { span++; ci++; } else break;
        }
      }
      const altoCelda = gridRowHeight * span;
      const blockWidth = gridColWidth / slotEntries.length;

      slotEntries.forEach((entry: any, idx: number) => {
        const blockLeft = x + idx * blockWidth;
        // Buscar el registro de contexto para tomar su color
        const registro = contexto.registros.find((r: any) =>
          r.cursoId === entry.componente?.oferta?.id_curso &&
          r.grupoCodigo === (entry.grupo?.codigo ?? '')
        ) || contexto.registros.find((r: any) =>
          r.cursoId === entry.componente?.oferta?.id_curso
        );
        const colorHex = registro
          ? (mapaColores.get(registro.indice) ?? obtenerColorLectivo(registro.indice ?? 1))
          : HEADER_BG;
        doc.rect(blockLeft, y, blockWidth, altoCelda).fillAndStroke(colorHex, BORDER_COLOR);
        const texto = formatearEtiquetaCeldaPdf(registro, entry, true);
        doc.fillColor('black').font('Helvetica-Bold').fontSize(5)
          .text(texto, blockLeft + 2, y + altoCelda / 2 - 8, {
            width: blockWidth - 4,
            align: 'center',
            lineBreak: true,
            height: altoCelda - 4,
            ellipsis: false,
          });
      });

      for (let offset = 1; offset < span; offset++) {
        slotsOcupados.add(`${dia}-${HORAS[horaIndex + offset]}`);
      }
    });
    y += gridRowHeight;
  });
}

// ────────────────────────────────────────────────────────────
// Dibujar bloques NO lectivos de docente en el horario
// ────────────────────────────────────────────────────────────

function dibujarBloquesNoLectivos(
  doc: PDFDocumentWithTable,
  bloquesNoLectivos: any[],
  mapaColoresNoLectiva: Map<string, string>,
  leftColX: number,
  horarioTop: number,
  gridColWidth: number,
  gridRowHeight: number,
  slotsOcupados: Set<string>
) {
  let y = horarioTop + 15;

  HORAS.forEach((hora, horaIndex) => {
    DIAS.forEach((dia, dIdx) => {
      const x = leftColX + (dIdx + 1) * gridColWidth;
      const slotKey = `${dia}-${hora}`;
      if (slotsOcupados.has(slotKey)) return;

      const slotEntries = bloquesNoLectivos.filter(
        b => b.dia_semana === dia && b.hora_inicio === hora
      );
      if (slotEntries.length === 0) return;

      let span = 1;
      if (slotEntries.length === 1) {
        span = calcularFusionNoLectiva(bloquesNoLectivos, dia, horaIndex, HORAS, slotEntries[0]);
      }
      const altoCelda = gridRowHeight * span;
      const blockWidth = gridColWidth / slotEntries.length;

      slotEntries.forEach((entry: any, idx: number) => {
        const blockLeft = x + idx * blockWidth;
        const colorHex = mapaColoresNoLectiva.get(entry.seccion) || NO_LECTIVA_BG;
        doc.rect(blockLeft, y, blockWidth, altoCelda).fillAndStroke(colorHex, BORDER_COLOR);
        const etiqueta = entry.seccion.replace(/_/g, ' ');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(5)
          .text(etiqueta, blockLeft + 2, y + altoCelda / 2 - 6, {
            width: blockWidth - 4,
            align: 'center',
            lineBreak: true,
            height: altoCelda - 4,
            ellipsis: false,
          });
      });

      for (let offset = 1; offset < span; offset++) {
        slotsOcupados.add(`${dia}-${HORAS[horaIndex + offset]}`);
      }
    });
    y += gridRowHeight;
  });
}

// ────────────────────────────────────────────────────────────
// Tabla detalle carga LECTIVA
// ────────────────────────────────────────────────────────────

function dibujarTablaDetalleLectiva(
  doc: PDFDocumentWithTable,
  contexto: any,
  mapaColores: Map<number, string>,
  tableStartX: number,
  colWidths: number[],
  startY: number
): number {
  const headers = ['N°', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T.H'];
  let currentY = startY;
  let currentX = tableStartX;

  doc.font('Helvetica-Bold').fontSize(7);
  headers.forEach((h, i) => {
    doc.rect(currentX, currentY, colWidths[i], 12).fillAndStroke(HEADER_BG, BORDER_COLOR);
    doc.fillColor('black').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
    currentX += colWidths[i];
  });
  currentY += 12;

  for (const info of contexto.registros) {
    const rowData = [
      String(info.indice),
      info.cursoNombre,
      String(info.teoria),
      String(info.practica),
      String(info.laboratorio),
      info.grupoCodigo,
      String(info.totalHoras),
    ];
    currentX = tableStartX;
    doc.font('Helvetica').fontSize(6).fillColor('black');
    const filaColor = mapaColores.get(info.indice) ?? obtenerColorLectivo(info.indice ?? 1);
    rowData.forEach((val, i) => {
      doc.rect(currentX, currentY, colWidths[i], 10)
        .fillAndStroke(filaColor, BORDER_COLOR);
      doc.fillColor('black').text(val, currentX, currentY + 2, {
        width: colWidths[i],
        height: 10,
        align: i === 1 ? 'left' : 'center',
        ellipsis: true,
        lineBreak: false,
      });
      currentX += colWidths[i];
    });
    currentY += 10;
  }
  return currentY;
}

// ────────────────────────────────────────────────────────────
// Tabla detalle carga NO LECTIVA
// ────────────────────────────────────────────────────────────

function dibujarTablaDetalleNoLectiva(
  doc: PDFDocumentWithTable,
  declaracion: any,
  mapaColoresNoLectiva: Map<string, string>,
  tableStartX: number,
  colWidthsNL: number[],
  startY: number
): number {
  const headers = ['N°', 'COMPONENTE', 'HORAS'];
  let currentY = startY;
  let currentX = tableStartX;

  doc.font('Helvetica-Bold').fontSize(7);
  headers.forEach((h, i) => {
    doc.rect(currentX, currentY, colWidthsNL[i], 12).fillAndStroke(NO_LECTIVA_BG, BORDER_COLOR);
    doc.fillColor('black').text(h, currentX, currentY + 3, { width: colWidthsNL[i], align: 'center' });
    currentX += colWidthsNL[i];
  });
  currentY += 12;

  if (declaracion?.secciones?.length) {
    declaracion.secciones.forEach((s: any, idx: number) => {
      const color = mapaColoresNoLectiva.get(s.seccion) || NO_LECTIVA_BG;
      const rowData = [
        String(idx + 1),
        s.seccion.replace(/_/g, ' '),
        `${s.horas_declaradas}h`,
      ];
      currentX = tableStartX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidthsNL[i], 10).fillAndStroke(color, BORDER_COLOR);
        doc.fillColor('black').text(val, currentX, currentY + 2, {
          width: colWidthsNL[i],
          height: 10,
          align: i === 1 ? 'left' : 'center',
          ellipsis: true,
          lineBreak: false,
        });
        currentX += colWidthsNL[i];
      });
      currentY += 10;
    });
  } else {
    doc.font('Helvetica').fontSize(6).fillColor('#888888')
      .text('Sin carga no lectiva declarada', tableStartX + 4, currentY + 2);
    currentY += 12;
  }
  return currentY;
}

// ────────────────────────────────────────────────────────────
// Página de CICLO
// ────────────────────────────────────────────────────────────

async function generarPaginaCiclo(
  doc: PDFDocumentWithTable,
  idPeriodo: number,
  idCiclo: number,
  periodo: any,
  ciclo: any
) {
  const topMargin = 40;
  const leftColX = 40;
  const pageWidth = doc.page.width - 80;
  const headerBoxWidth = pageWidth * 0.3;
  const headerBoxHeight = 110;

  dibujarCajaInfoPeriodo(doc, leftColX, topMargin, headerBoxWidth, headerBoxHeight, [
    'UNIVERSIDAD NACIONAL DE TRUJILLO',
    'FACULTAD DE INGENIERÍA',
    'ESCUELA DE INGENIERÍA DE SISTEMAS',
    `CICLO: ${ciclo?.numero}°`,
    'SECCIÓN: ÚNICA',
    `AÑO ACADÉMICO: ${new Date().getFullYear()}`,
    `SEMESTRE: ${periodo?.nombre}`,
    `INICIO DEL CICLO: ${periodo?.fecha_inicio ? new Date(periodo.fecha_inicio).toLocaleDateString('es-PE') : '-'}`,
    `TÉRMINO DEL CICLO: ${periodo?.fecha_fin ? new Date(periodo.fecha_fin).toLocaleDateString('es-PE') : '-'}`,
  ]);

  const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T.H', 'DEPARTAMENTO'];
  const availableTableWidth = pageWidth - headerBoxWidth - 20;
  const colWidths = [
    availableTableWidth * 0.04,
    availableTableWidth * 0.22,
    availableTableWidth * 0.30,
    availableTableWidth * 0.06,
    availableTableWidth * 0.06,
    availableTableWidth * 0.06,
    availableTableWidth * 0.06,
    availableTableWidth * 0.08,
    availableTableWidth * 0.12,
  ];
  const tableStartX = leftColX + headerBoxWidth + 20;
  let currentY = topMargin;
  let currentX = tableStartX;

  doc.font('Helvetica-Bold').fontSize(7);
  detailHeaders.forEach((h, i) => {
    doc.rect(currentX, currentY, colWidths[i], 12).fillAndStroke(HEADER_BG, BORDER_COLOR);
    doc.fillColor('black').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
    currentX += colWidths[i];
  });
  currentY += 12;

  const bloques = await prisma.bloque_horario.findMany({
    where: {
      id_periodo: idPeriodo,
      componente: { oferta: { id_ciclo: idCiclo, id_periodo: idPeriodo } },
    },
    include: {
      docente: true,
      ambiente: true,
      grupo: true,
      componente: { include: { oferta: { include: { curso: true, ciclo: true } } } },
    },
    orderBy: [
      { dia_semana: 'asc' },
      { hora_inicio: 'asc' },
      { id_docente: 'asc' },
      { id_componente: 'asc' },
      { id_grupo: 'asc' },
    ],
  });

  const contexto = crearContextoHorarioCiclo(bloques as any[]);
  const mapaColores = construirMapaColoresLectivos(contexto);

  for (const info of contexto.registros) {
    const rowData = [
      String(info.indice),
      info.docenteNombre,
      info.cursoNombre,
      String(info.teoria),
      String(info.practica),
      String(info.laboratorio),
      info.grupoCodigo,
      String(info.totalHoras),
      info.departamento,
    ];
    currentX = tableStartX;
    doc.font('Helvetica').fontSize(6).fillColor('black');
    const filaColor = mapaColores.get(info.indice) ?? obtenerColorLectivo(info.indice ?? 1);
    rowData.forEach((val, i) => {
      doc.rect(currentX, currentY, colWidths[i], 10)
        .fillAndStroke(filaColor, BORDER_COLOR);
      doc.fillColor('black').text(val, currentX, currentY + 2, {
        width: colWidths[i],
        height: 10,
        align: i === 1 || i === 2 ? 'left' : 'center',
        ellipsis: true,
        lineBreak: false,
      });
      currentX += colWidths[i];
    });
    currentY += 10;
  }

  // ── Página 2: horario ──
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
  const horarioTop = 40;
  const gridColWidth = (doc.page.width - 80) / 7;
  const gridRowHeight = 32;

  dibujarRejillaBase(doc, leftColX, horarioTop, gridColWidth, gridRowHeight);
  dibujarBloquesCiclo(doc, contexto, mapaColores, leftColX, horarioTop, gridColWidth, gridRowHeight);
}

// ────────────────────────────────────────────────────────────
// Página de DOCENTE
// ────────────────────────────────────────────────────────────

async function generarPaginaDocente(
  doc: PDFDocumentWithTable,
  idPeriodo: number,
  idDocente: number,
  periodo: any,
  docente: any,
  exportOption: 'completo' | 'carga-lectiva' | 'carga-no-lectiva' = 'completo'
) {
  const leftColX = 40;
  const topMargin = 40;
  const pageWidth = doc.page.width - 80;
  const headerBoxWidth = pageWidth * 0.3;
  const headerBoxHeight = 110;

  // ── Cabecera ──
  dibujarCajaInfoPeriodo(doc, leftColX, topMargin, headerBoxWidth, headerBoxHeight, [
    'UNIVERSIDAD NACIONAL DE TRUJILLO',
    'FACULTAD DE INGENIERÍA',
    'ESCUELA DE INGENIERÍA DE SISTEMAS',
    `DOCENTE: ${docente?.apellidos}, ${docente?.nombres}`,
    `CATEGORÍA: ${docente?.categoria}`,
    `MODALIDAD: ${docente?.modalidad}`,
    `SEMESTRE: ${periodo?.nombre}`,
    `FECHA: ${new Date().toLocaleDateString('es-PE')}`,
  ]);

  // ── Consultas ──
  const bloques = await prisma.bloque_horario.findMany({
    where: {
      id_periodo: idPeriodo,
      id_docente: idDocente,
      estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
    },
    include: {
      docente: true,
      ambiente: true,
      grupo: true,
      componente: {
        include: { oferta: { include: { curso: true, ciclo: true } } },
      },
    },
    orderBy: [
      { dia_semana: 'asc' },
      { hora_inicio: 'asc' },
      { id_componente: 'asc' },
      { id_grupo: 'asc' },
    ],
  });

  const declaraciones = await prisma.declaracion_carga.findMany({
    where: { id_periodo: idPeriodo, id_docente: idDocente },
    include: { secciones: true },
  });
  const bloquesNoLectivos = await prisma.bloque_no_lectivo.findMany({
    where: { id_periodo: idPeriodo, id_docente: idDocente },
    orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
  });
  const declaracion = declaraciones[0] ?? null;

  const contexto = crearContextoHorarioCiclo(bloques as any[]);
  const mapaColores = construirMapaColoresLectivos(contexto);

  // ── Mapa de colores para secciones no lectivas ──
  const mapaColoresNoLectiva = new Map<string, string>();
  if (declaracion?.secciones) {
    declaracion.secciones.forEach((s: any, idx: number) => {
      mapaColoresNoLectiva.set(s.seccion, obtenerColorNoLectiva(idx));
    });
  }

  // ── Calcular ancho disponible para tablas ──
  const availableTableWidth = pageWidth - headerBoxWidth - 20;
  const tableStartX = leftColX + headerBoxWidth + 20;

  // ── Widths para tabla lectiva (sin columna CICLO) ──
  const colWidthsLectiva = [
    availableTableWidth * 0.07,  // N°
    availableTableWidth * 0.40,  // ASIGNATURA
    availableTableWidth * 0.09,  // T
    availableTableWidth * 0.09,  // P
    availableTableWidth * 0.09,  // L
    availableTableWidth * 0.13,  // G
    availableTableWidth * 0.13,  // T.H
  ];

  // ── Widths para tabla no-lectiva ──
  const colWidthsNL = [
    availableTableWidth * 0.10,  // N°
    availableTableWidth * 0.65,  // COMPONENTE
    availableTableWidth * 0.25,  // HORAS
  ];

  let currentY = topMargin;

  // ── Página 1: Detalle ──
  if (exportOption === 'completo') {
    // Tabla lectiva
    currentY = dibujarTablaDetalleLectiva(
      doc, contexto, mapaColores,
      tableStartX, colWidthsLectiva, currentY
    );

    // Separador visual
    currentY += 8;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#555555')
      .text('CARGA NO LECTIVA', tableStartX, currentY);
    currentY += 10;

    // Tabla no lectiva
    dibujarTablaDetalleNoLectiva(
      doc, declaracion, mapaColoresNoLectiva,
      tableStartX, colWidthsNL, currentY
    );

  } else if (exportOption === 'carga-lectiva') {
    dibujarTablaDetalleLectiva(
      doc, contexto, mapaColores,
      tableStartX, colWidthsLectiva, currentY
    );

  } else if (exportOption === 'carga-no-lectiva') {
    dibujarTablaDetalleNoLectiva(
      doc, declaracion, mapaColoresNoLectiva,
      tableStartX, colWidthsNL, currentY
    );
  }

  // ── Página 2: Horario ──
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });

  const horarioTop = 40;
  const gridColWidth = (doc.page.width - 80) / 7;
  const gridRowHeight = 32;

  dibujarRejillaBase(doc, leftColX, horarioTop, gridColWidth, gridRowHeight);

  const slotsOcupados = new Set<string>();

  if (exportOption === 'completo' || exportOption === 'carga-lectiva') {
    dibujarBloquesDocente(
      doc, bloques, contexto, mapaColores,
      leftColX, horarioTop, gridColWidth, gridRowHeight, slotsOcupados
    );
  }

  if (exportOption === 'completo' || exportOption === 'carga-no-lectiva') {
    // Para "solo no lectiva" necesitamos un set limpio
    const slotsNL = exportOption === 'carga-no-lectiva' ? new Set<string>() : slotsOcupados;
    dibujarBloquesNoLectivos(
      doc, bloquesNoLectivos, mapaColoresNoLectiva,
      leftColX, horarioTop, gridColWidth, gridRowHeight, slotsNL
    );
  }
}

// ────────────────────────────────────────────────────────────
// Página de AMBIENTE
// ────────────────────────────────────────────────────────────

async function generarPaginaAmbiente(
  doc: PDFDocumentWithTable,
  idPeriodo: number,
  idAmbiente: number,
  periodo: any,
  ambiente: any
) {
  const leftColX = 40;
  const topMargin = 40;
  const pageWidth = doc.page.width - 80;
  const headerBoxWidth = pageWidth * 0.3;
  const headerBoxHeight = 100;

  dibujarCajaInfoPeriodo(doc, leftColX, topMargin, headerBoxWidth, headerBoxHeight, [
    'UNIVERSIDAD NACIONAL DE TRUJILLO',
    'FACULTAD DE INGENIERÍA',
    'ESCUELA DE INGENIERÍA DE SISTEMAS',
    `AMBIENTE: ${ambiente?.codigo} (${ambiente?.tipo})`,
    `CAPACIDAD: ${ambiente?.capacidad} personas`,
    `SEMESTRE: ${periodo?.nombre}`,
    `FECHA: ${new Date().toLocaleDateString('es-PE')}`,
  ]);

  const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'TIPO', 'G', 'TOT'];
  const availableTableWidth = pageWidth - headerBoxWidth - 20;
  const colWidths = [
    availableTableWidth * 0.06,
    availableTableWidth * 0.27,
    availableTableWidth * 0.40,
    availableTableWidth * 0.12,
    availableTableWidth * 0.08,
    availableTableWidth * 0.07,
  ];
  const tableStartX = leftColX + headerBoxWidth + 20;
  let currentY = topMargin;
  let currentX = tableStartX;

  doc.font('Helvetica-Bold').fontSize(7);
  detailHeaders.forEach((h, i) => {
    doc.rect(currentX, currentY, colWidths[i], 12).fillAndStroke(HEADER_BG, BORDER_COLOR);
    doc.fillColor('black').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
    currentX += colWidths[i];
  });
  currentY += 12;

  const bloques = await prisma.bloque_horario.findMany({
    where: {
      id_periodo: idPeriodo,
      id_ambiente: idAmbiente,
      estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
    },
    include: {
      docente: true,
      componente: { include: { oferta: { include: { curso: true } } } },
      grupo: true,
    },
  });

  const mapaDocenteCurso: Record<string, any> = {};
  const coloresPorCurso = new Map<number, string>();
  let indexDocente = 1;

  (bloques as any[]).forEach(b => {
    const cursoId = b.componente.oferta.id_curso;
    const key = `${b.id_docente}-${b.componente.id_oferta}`;
    if (!mapaDocenteCurso[key]) {
      if (!coloresPorCurso.has(cursoId)) {
        // Asignamos un color de nuestra paleta lectiva (índice = tamaño actual + 1)
        coloresPorCurso.set(cursoId, obtenerColorLectivo(coloresPorCurso.size + 1));
      }
      mapaDocenteCurso[key] = {
        indice: indexDocente++,
        color: coloresPorCurso.get(cursoId) ?? obtenerColorLectivo(1),
        nombre: `${b.docente.apellidos}, ${b.docente.nombres.substring(0, 1)}.`,
        cursoNombre: b.componente.oferta.curso.nombre,
        tipo: b.componente.tipo,
        grupo: b.grupo.codigo,
        total: 0,
      };
    }
    mapaDocenteCurso[key].total += 1;
  });

  for (const key in mapaDocenteCurso) {
    const info = mapaDocenteCurso[key];
    const rowData = [
      String(info.indice),
      info.nombre,
      info.cursoNombre,
      info.tipo,
      info.grupo,
      String(info.total),
    ];
    currentX = tableStartX;
    doc.font('Helvetica').fontSize(6).fillColor('black');
    rowData.forEach((val, i) => {
      doc.rect(currentX, currentY, colWidths[i], 10).fillAndStroke(info.color, BORDER_COLOR);
      doc.fillColor('black').text(val, currentX, currentY + 2, {
        width: colWidths[i],
        align: i === 1 || i === 2 ? 'left' : 'center',
        ellipsis: true,
      });
      currentX += colWidths[i];
    });
    currentY += 10;
  }

  // ── Página 2: horario ──
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });

  const celdasPorSlot: Record<string, Array<{ bloque: any; info: any }>> = {};
  for (const bloque of bloques as any[]) {
    const info = mapaDocenteCurso[`${bloque.id_docente}-${bloque.componente.id_oferta}`];
    const slotKey = `${bloque.dia_semana}-${bloque.hora_inicio}`;
    const entradas = celdasPorSlot[slotKey] ?? [];
    entradas.push({ bloque, info });
    celdasPorSlot[slotKey] = entradas;
  }

  const horarioTop = 40;
  const gridColWidth = (doc.page.width - 80) / 7;
  const gridRowHeight = 32;

  dibujarRejillaBase(doc, leftColX, horarioTop, gridColWidth, gridRowHeight);

  let y = horarioTop + 15;
  const slotsOcupados = new Set<string>();

  HORAS.forEach((hora, horaIndex) => {
    DIAS.forEach((dia, dIdx) => {
      const x = leftColX + (dIdx + 1) * gridColWidth;
      const slotKey = `${dia}-${hora}`;
      if (slotsOcupados.has(slotKey)) return;

      const celdasEnHora = celdasPorSlot[slotKey] ?? [];
      if (celdasEnHora.length === 0) return;

      let span = 1;
      if (celdasEnHora.length === 1) {
        span = calcularFusionPdf(celdasPorSlot, dia, horaIndex, HORAS, celdasEnHora[0].bloque);
      }
      const altoCelda = gridRowHeight * span;
      const blockWidth = gridColWidth / celdasEnHora.length;

      celdasEnHora.forEach((celda, idx) => {
        const blockLeft = x + idx * blockWidth;
        doc.rect(blockLeft, y, blockWidth, altoCelda)
          .fillAndStroke(celda.info?.color || '#FFFFFF', BORDER_COLOR);

        let cursoNombre = '';
        const nombre = celda.bloque?.componente?.oferta?.curso?.nombre || '';
        if (nombre) {
          const palabras = nombre.split(' ');
          cursoNombre = palabras.length > 3
            ? palabras.map((p: string) => p.charAt(0).toUpperCase()).join('')
            : nombre;
        }
        const esTeoria = celda.bloque?.componente?.tipo === 'TEORIA';
        const grupoEtiqueta = (!esTeoria && celda.bloque?.grupo?.codigo)
          ? `Gr. ${celda.bloque.grupo.codigo}` : '';
        const texto = [String(celda.info?.indice || ''), cursoNombre, grupoEtiqueta]
          .filter(Boolean).join('\n');

        doc.fillColor('black').font('Helvetica-Bold').fontSize(5)
          .text(texto, blockLeft + 2, y + altoCelda / 2 - 8, {
            width: blockWidth - 4,
            align: 'center',
            lineBreak: true,
            height: altoCelda - 4,
            ellipsis: false,
          });
      });

      for (let offset = 1; offset < span; offset++) {
        slotsOcupados.add(`${dia}-${HORAS[horaIndex + offset]}`);
      }
    });
    y += gridRowHeight;
  });
}

// ────────────────────────────────────────────────────────────
// GeneradorPdfService (API pública — mantiene firmas anteriores)
// ────────────────────────────────────────────────────────────

export class GeneradorPdfService {

  // ── Horario por ciclo ──────────────────────────────────────

  static async generarHorarioPdf(idPeriodo: number, idCiclo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclo = await prisma.ciclo.findUnique({ where: { id: idCiclo } });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      generarPaginaCiclo(doc, idPeriodo, idCiclo, periodo, ciclo).then(() => doc.end());
    });
  }

  static async generarTodosLosCiclosPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclos = await prisma.ciclo.findMany({
      where: { id_periodo: idPeriodo, ofertas: { some: {} } },
      orderBy: { numero: 'asc' },
    });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < ciclos.length; i++) {
        if (i > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        await generarPaginaCiclo(doc, idPeriodo, ciclos[i].id, periodo, ciclos[i]);
      }
      doc.end();
    });
  }

  // ── Horario por docente ────────────────────────────────────

  static async generarHorarioDocentePdf(
    idPeriodo: number,
    idDocente: number,
    exportOption: 'completo' | 'carga-lectiva' | 'carga-no-lectiva' = 'completo'
  ): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docente = await prisma.docente.findUnique({ where: { id: idDocente } });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      generarPaginaDocente(doc, idPeriodo, idDocente, periodo, docente, exportOption).then(() => doc.end());
    });
  }

  static async generarGlobalPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docentes = await prisma.docente.findMany({
      where: {
        asignaciones: {
          some: { componente: { oferta: { id_periodo: idPeriodo } } },
        },
      },
      orderBy: { apellidos: 'asc' },
    });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < docentes.length; i++) {
        if (i > 0) doc.addPage({ layout: 'landscape' });
        await generarPaginaDocente(doc, idPeriodo, docentes[i].id, periodo, docentes[i]);
      }
      doc.end();
    });
  }

  // ── Horario por ambiente ───────────────────────────────────

  static async generarHorarioAmbientePdf(idPeriodo: number, idAmbiente: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      generarPaginaAmbiente(doc, idPeriodo, idAmbiente, periodo, ambiente).then(() => doc.end());
    });
  }

  static async generarTodosLosAmbientesPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambientes = await prisma.ambiente.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
    });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < ambientes.length; i++) {
        if (i > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        await generarPaginaAmbiente(doc, idPeriodo, ambientes[i].id, periodo, ambientes[i]);
      }
      doc.end();
    });
  }

  // ── Auditoría por día ──────────────────────────────────────

  static async generarAuditoriaDiaPdf(idPeriodo: number, dia: string): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, dia_semana: dia },
      include: {
        docente: true,
        ambiente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
      },
      orderBy: [
        { id_docente: 'asc' },
        { componente: { id_oferta: 'asc' } },
        { id_ambiente: 'asc' },
        { hora_inicio: 'asc' },
      ],
    });

    const bloquesAgrupados: any[] = [];
    if (bloques.length > 0) {
      let actual = { ...bloques[0] };
      for (let i = 1; i < bloques.length; i++) {
        const b = bloques[i];
        const esContiguo =
          b.id_docente === actual.id_docente &&
          b.componente.id_oferta === actual.componente.id_oferta &&
          b.id_ambiente === actual.id_ambiente &&
          b.hora_inicio === actual.hora_fin;
        if (esContiguo) {
          actual.hora_fin = b.hora_fin;
        } else {
          bloquesAgrupados.push(actual);
          actual = { ...b };
        }
      }
      bloquesAgrupados.push(actual);
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(14).font('Helvetica-Bold')
        .text(`REPORTE DE AUDITORÍA - ${dia}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text(`Periodo: ${periodo?.nombre} | Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colX = [30, 100, 250, 450, 500, 580, 750];
      const headers = ['HORARIO', 'DOCENTE', 'ASIGNATURA', 'CICLO', 'TIPO', 'AMBIENTE'];

      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => {
        doc.rect(colX[i], tableTop, colX[i + 1] - colX[i], 15).fillAndStroke(HEADER_BG, BORDER_COLOR);
        doc.fillColor('black').text(h, colX[i], tableTop + 4, {
          width: colX[i + 1] - colX[i],
          align: 'center',
        });
      });

      let currentY = tableTop + 15;
      doc.font('Helvetica').fontSize(8).fillColor('black');

      bloquesAgrupados.forEach(b => {
        if (currentY > 500) {
          doc.addPage({ layout: 'landscape' });
          currentY = 30;
        }
        const row = [
          `${b.hora_inicio} - ${b.hora_fin}`,
          `${b.docente.apellidos}, ${b.docente.nombres}`,
          b.componente.oferta.curso.nombre,
          `${b.componente.oferta.id_ciclo}°`,
          b.componente.tipo,
          b.ambiente?.codigo || 'Por asignar',
        ];
        row.forEach((val, i) => {
          doc.rect(colX[i], currentY, colX[i + 1] - colX[i], 15).stroke(BORDER_COLOR);
          doc.text(val, colX[i] + 2, currentY + 4, {
            width: colX[i + 1] - colX[i] - 4,
            align: i === 1 || i === 2 ? 'left' : 'center',
            ellipsis: true,
          });
        });
        currentY += 15;
      });

      doc.end();
    });
  }
}

type PDFDocumentWithTable = typeof PDFDocument.prototype;