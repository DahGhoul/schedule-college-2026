import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import { crearContextoHorarioCiclo, formatearEtiquetaCelda, obtenerColorCurso } from './horario-ciclo.utils';

const BORDER_COLOR = '#94A3B8'; // Darker grey border

function formatearFranjaHora(horaInicio: string): string {
  const [horas, minutos] = horaInicio.split(':');
  const horaFinal = String(Number(horas) + 1).padStart(2, '0');
  return `${Number(horas)}:${minutos} - ${Number(horaFinal)}:${minutos}`;
}

function obtenerClaveFusionPdf(bloque: any): string {
  // Include group ID to prevent merging different groups
  const grupoId = bloque.grupo?.id ?? '';
  return `${bloque.dia_semana}-${bloque.id_docente}-${bloque.componente.id_oferta}-${bloque.componente.tipo}-${grupoId}`;
}

function formatearEtiquetaCeldaPdf(registro: any, bloque: any): string {
  const ambienteEtiqueta = bloque?.ambiente?.codigo || 'Solic.';
  let cursoNombre = '';
  if (registro?.nombre) {
    const palabras = registro.nombre.split(' ');
    if (palabras.length > 3) {
      cursoNombre = palabras.map(p => p.charAt(0).toUpperCase()).join('');
    } else {
      cursoNombre = registro.nombre;
    }
  } else if (bloque?.componente?.oferta?.curso?.nombre) {
    const palabras = bloque.componente.oferta.curso.nombre.split(' ');
    if (palabras.length > 3) {
      cursoNombre = palabras.map(p => p.charAt(0).toUpperCase()).join('');
    } else {
      cursoNombre = bloque.componente.oferta.curso.nombre;
    }
  }

  const esTeoria = bloque?.componente?.tipo === 'TEORIA';
  const grupoEtiqueta = (!esTeoria && bloque?.grupo?.codigo) ? `Gr. ${bloque.grupo.codigo}` : '';

  if (!registro) {
    return [cursoNombre, ambienteEtiqueta].filter(Boolean).join('\n');
  }

  const partes = [String(registro.indice), cursoNombre];
  if (grupoEtiqueta) {
    partes.push(grupoEtiqueta);
  }
  partes.push(ambienteEtiqueta);
  return partes.filter(Boolean).join('\n');
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

  for (let siguienteIndex = horaIndex + 1; siguienteIndex < horas.length; siguienteIndex++) {
    const siguienteEntradas = contexto[`${dia}-${horas[siguienteIndex]}`] ?? [];
    if (siguienteEntradas.length !== 1) break;

    const siguienteBloque = siguienteEntradas[0].bloque;
    if (obtenerClaveFusionPdf(siguienteBloque) !== clave) break;

    span += 1;
  }

  return span;
}

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
    const y = topMargin + (index * lineHeight);
    doc.fontSize(index === 0 ? 10 : 8).font(index === 0 ? 'Helvetica-Bold' : 'Helvetica').text(linea, leftColX, y, {
      width: width - 12,
      align: 'center',
    });
  });
}

export class GeneradorPdfService {
  static async generarHorarioPdf(idPeriodo: number, idCiclo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclo = await prisma.ciclo.findUnique({ where: { id: idCiclo } });
    
    const doc = new PDFDocument({ 
      margin: 30, 
      size: 'A4',
      layout: 'landscape'
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.generarPaginaCiclo(doc, idPeriodo, idCiclo, periodo, ciclo).then(() => {
        doc.end();
      });
    });
  }

  static async generarHorarioDocentePdf(idPeriodo: number, idDocente: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docente = await prisma.docente.findUnique({ where: { id: idDocente } });
    
    const doc = new PDFDocument({ 
      margin: 30, 
      size: 'A4',
      layout: 'landscape'
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.generarPaginaDocente(doc, idPeriodo, idDocente, periodo, docente).then(() => {
        doc.end();
      });
    });
  }

  private static async generarPaginaDocente(doc: PDFDocumentWithTable, idPeriodo: number, idDocente: number, periodo: any, docente: any) {
    const leftColX = 40;
    const topMargin = 40;
    const pageWidth = doc.page.width - 80;
    const headerBoxWidth = pageWidth * 0.3; // Reduced to 30%
    const headerBoxHeight = 110; // Reduced height

    // --- PÁGINA 1: CABECERA (IZQUIERDA) + TABLA DE DETALLE (DERECHA) ---
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

    const detailHeaders = ['N°', 'ASIGNATURA', 'CICLO', 'T', 'L', 'GRP', 'TOT'];
    const availableTableWidth = pageWidth - headerBoxWidth - 20;
    const colWidths = [
      availableTableWidth * 0.05, 
      availableTableWidth * 0.45, 
      availableTableWidth * 0.10, 
      availableTableWidth * 0.08, 
      availableTableWidth * 0.08, 
      availableTableWidth * 0.12, 
      availableTableWidth * 0.12
    ];
    const tableStartX = leftColX + headerBoxWidth + 20;
    let currentY = topMargin;
    
    // Draw table header
    doc.font('Helvetica-Bold').fontSize(7);
    let currentX = tableStartX;
    detailHeaders.forEach((h, i) => {
      doc.rect(currentX, currentY, colWidths[i], 12).fill('#1E293B').stroke('#1E293B');
      doc.fillColor('white').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });
    currentY += 12;

    const asignaciones = await prisma.asignacion_docente_componente.findMany({
      where: { id_docente: idDocente, componente: { oferta: { id_periodo: idPeriodo } } },
      include: {
        componente: { 
          include: { 
            oferta: { include: { curso: true } },
            grupos: true
          } 
        }
      }
    });

    const mapaCursos: Record<number, { indice: number; color: string; nombre: string; ciclo: number; teo: number; lab: number; grupos: number; total: number }> = {};
    let indexCurso = 1;

    for (const asig of asignaciones as any[]) {
      const cursoId = asig.componente.oferta.id_curso;
      if (!mapaCursos[cursoId]) {
        const colorCurso = obtenerColorCurso(indexCurso).slice(2);
        mapaCursos[cursoId] = {
          indice: indexCurso++,
          color: colorCurso,
          nombre: asig.componente.oferta.curso.nombre,
          ciclo: asig.componente.oferta.id_ciclo,
          teo: 0,
          lab: 0,
          grupos: 0,
          total: 0
        };
      }
      if (asig.componente.tipo === 'TEORIA') mapaCursos[cursoId].teo += asig.horas_asignadas;
      else mapaCursos[cursoId].lab += asig.horas_asignadas;
      mapaCursos[cursoId].grupos += asig.componente.grupos.length;
      mapaCursos[cursoId].total += asig.horas_asignadas;
    }

    for (const key in mapaCursos) {
      const info = mapaCursos[key];
      const rowData = [String(info.indice), info.nombre, `${info.ciclo}°`, String(info.teo), String(info.lab), String(info.grupos), String(info.total)];
      currentX = tableStartX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(`#${info.color}`).stroke(BORDER_COLOR);
        doc.fillColor('#334155').text(val, currentX, currentY + 2, { width: colWidths[i], align: 'center', ellipsis: true });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    // --- PÁGINA 2: HORARIO COMPLETO (ocupa todo el ancho) ---
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });

    const horarioTop = 40;
    const dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridColWidth = (doc.page.width - 80) / 7;
    const gridRowHeight = 32; // Increased height a bit more

    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(leftColX, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
    doc.fillColor('white').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });
    dias.forEach((dia, i) => {
      const x = leftColX + (i + 1) * gridColWidth;
      doc.rect(x, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
      doc.fillColor('white').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
    });

    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, id_docente: idDocente },
      include: { componente: { include: { oferta: true } }, ambiente: true }
    });

    const celdasPorSlot: Record<string, Array<{ bloque: any; info: any }>> = {};
    for (const bloque of bloques as any[]) {
      const info = mapaCursos[bloque.componente.oferta.id_curso];
      const slotKey = `${bloque.dia_semana}-${bloque.hora_inicio}`;
      const entradas = celdasPorSlot[slotKey] ?? [];
      entradas.push({ bloque, info });
      celdasPorSlot[slotKey] = entradas;
    }

    const slotsOcupados = new Set<string>();
    let y = horarioTop + 15;
    horas.forEach((hora, horaIndex) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });
      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const slotKey = `${dia}-${hora}`;
        if (slotsOcupados.has(slotKey)) {
          return;
        }

        const celdasEnHora = celdasPorSlot[slotKey] ?? [];
        
        doc.rect(x, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
        if (celdasEnHora.length > 0) {
          // Check if all have same curso/docente to merge vertically
          const puedeFusionar = celdasEnHora.length === 1;
          const primerBloque = celdasEnHora[0].bloque;
          const span = puedeFusionar ? calcularFusionPdf(celdasPorSlot, dia, horaIndex, horas, primerBloque) : 1;
          const altoCelda = gridRowHeight * span;

        doc.rect(x, y, gridColWidth, altoCelda).fill(celdasEnHora[0].info?.color || '#FFFFFF').stroke(BORDER_COLOR);

          // Draw each entry separated and vertically centered
          const entryHeight = altoCelda / celdasEnHora.length;
          celdasEnHora.forEach((celda, idx) => {
            const texto = formatearEtiquetaCeldaPdf(celda.info, celda.bloque);
            const textoY = y + idx * entryHeight + (entryHeight / 2) - 8; // Vertical center
            doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(6).text(texto, x + 2, textoY, {
              width: gridColWidth - 4,
              align: 'center',
              lineBreak: true
            });
          });

          if (span > 1) {
            for (let offset = 1; offset < span; offset++) {
              slotsOcupados.add(`${dia}-${horas[horaIndex + offset]}`);
            }
          }
        }
      });
      y += gridRowHeight;
    });
  }

  private static async generarPaginaCiclo(doc: PDFDocumentWithTable, idPeriodo: number, idCiclo: number, periodo: any, ciclo: any) {
    const topMargin = 40;
    const leftColX = 40;
    const pageWidth = doc.page.width - 80;
    const headerBoxWidth = pageWidth * 0.3; // Reduced to 30%
    const headerBoxHeight = 110; // Reduced height

    // --- PÁGINA 1: CABECERA (IZQUIERDA) + TABLA DE DETALLE (DERECHA) ---
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
      availableTableWidth * 0.12
    ];
    const tableStartX = leftColX + headerBoxWidth + 20;
    let currentY = topMargin;
    let currentX = tableStartX;

    doc.font('Helvetica-Bold').fontSize(7);
    detailHeaders.forEach((h, i) => {
      doc.rect(currentX, currentY, colWidths[i], 12).fill('#1E293B').stroke('#1E293B');
      doc.fillColor('white').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });
    currentY += 12;

    const bloques = await prisma.bloque_horario.findMany({
      where: {
        id_periodo: idPeriodo,
        componente: { oferta: { id_ciclo: idCiclo, id_periodo: idPeriodo } }
      },
      include: {
        docente: true,
        ambiente: true,
        grupo: true,
        componente: { include: { oferta: { include: { curso: true } } } }
      },
      orderBy: [
        { dia_semana: 'asc' },
        { hora_inicio: 'asc' },
        { id_docente: 'asc' },
        { id_componente: 'asc' },
        { id_grupo: 'asc' }
      ]
    });

    const contexto = crearContextoHorarioCiclo(bloques as any[]);
    const slotsOcupados = new Set<string>();

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
        info.departamento
      ];

      currentX = tableStartX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(`#${info.color.slice(2)}`).stroke(BORDER_COLOR);
        doc.fillColor('#334155').text(val, currentX, currentY + 2, {
          width: colWidths[i],
          height: 10,
          align: i === 1 || i === 2 ? 'left' : 'center',
          ellipsis: true,
          lineBreak: false
        });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    // --- PÁGINA 2: HORARIO COMPLETO (ocupa todo el ancho) ---
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });

    const horarioTop = 40;
    const dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const horas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    const gridColWidth = (doc.page.width - 80) / 7;
    const gridRowHeight = 32; // Increased height a bit more

    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(leftColX, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
    doc.fillColor('white').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });

    dias.forEach((dia, i) => {
      const x = leftColX + (i + 1) * gridColWidth;
      doc.rect(x, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
      doc.fillColor('white').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
    });

    let y = horarioTop + 15;
    horas.forEach((hora, horaIndex) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });

      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const slotKey = `${dia}-${hora}`;
        if (slotsOcupados.has(slotKey)) {
          return;
        }

        const entradas = contexto.celdas[slotKey] ?? [];

        if (entradas.length === 0) {
          doc.rect(x, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
          return;
        }

        const puedeFusionar = entradas.length === 1;
        const primerBloque = entradas[0].bloque;
        const span = puedeFusionar ? calcularFusionPdf(contexto.celdas, dia, horaIndex, horas, primerBloque) : 1;
        const altoCelda = gridRowHeight * span;

        doc.rect(x, y, gridColWidth, altoCelda).fill(`#${entradas[0].registro.color.slice(2)}`).stroke(BORDER_COLOR);

        // Draw each entry separated and vertically centered
        const entryHeight = altoCelda / entradas.length;
        entradas.forEach((celda, idx) => {
          const texto = formatearEtiquetaCeldaPdf(celda.registro, celda.bloque);
          const textoY = y + idx * entryHeight + (entryHeight / 2) - 8; // Vertical center
          doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(6).text(texto, x + 2, textoY, {
            width: gridColWidth - 4,
            align: 'center',
            lineBreak: true
          });
        });

        if (span > 1) {
          for (let offset = 1; offset < span; offset++) {
            slotsOcupados.add(`${dia}-${horas[horaIndex + offset]}`);
          }
        }
      });

      y += gridRowHeight;
    });
  }

  static async generarHorarioAmbientePdf(idPeriodo: number, idAmbiente: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.generarPaginaAmbiente(doc, idPeriodo, idAmbiente, periodo, ambiente).then(() => doc.end());
    });
  }

  static async generarTodosLosAmbientesPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambientes = await prisma.ambiente.findMany({ 
      where: { activo: true },
      orderBy: { codigo: 'asc' } 
    });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < ambientes.length; i++) {
        if (i > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        await this.generarPaginaAmbiente(doc, idPeriodo, ambientes[i].id, periodo, ambientes[i]);
      }
      doc.end();
    });
  }

  private static async generarPaginaAmbiente(doc: PDFDocumentWithTable, idPeriodo: number, idAmbiente: number, periodo: any, ambiente: any) {
    const leftColX = 40;
    const topMargin = 40;
    const pageWidth = doc.page.width - 80;
    const headerBoxWidth = pageWidth * 0.3; // Reduced to 30%
    const headerBoxHeight = 100; // Reduced height

    // --- PÁGINA 1: CABECERA (IZQUIERDA) + TABLA DE DETALLE (DERECHA) ---
    dibujarCajaInfoPeriodo(doc, leftColX, topMargin, headerBoxWidth, headerBoxHeight, [
      'UNIVERSIDAD NACIONAL DE TRUJILLO',
      'FACULTAD DE INGENIERÍA',
      'ESCUELA DE INGENIERÍA DE SISTEMAS',
      `AMBIENTE: ${ambiente?.codigo} (${ambiente?.tipo})`,
      `CAPACIDAD: ${ambiente?.capacidad} personas`,
      `SEMESTRE: ${periodo?.nombre}`,
      `FECHA: ${new Date().toLocaleDateString('es-PE')}`,
    ]);

    const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'CICLO', 'TIPO', 'G', 'TOT'];
    const availableTableWidth = pageWidth - headerBoxWidth - 20;
    const colWidths = [
      availableTableWidth * 0.05, 
      availableTableWidth * 0.25, 
      availableTableWidth * 0.35, 
      availableTableWidth * 0.08, 
      availableTableWidth * 0.08, 
      availableTableWidth * 0.08, 
      availableTableWidth * 0.11
    ];
    const tableStartX = leftColX + headerBoxWidth + 20;
    let currentY = topMargin;
    
    doc.font('Helvetica-Bold').fontSize(7);
    let currentX = tableStartX;
    detailHeaders.forEach((h, i) => {
      doc.rect(currentX, currentY, colWidths[i], 12).fill('#1E293B').stroke('#1E293B');
      doc.fillColor('white').text(h, currentX, currentY + 3, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });
    currentY += 12;

    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, id_ambiente: idAmbiente, estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } },
      include: {
        docente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        grupo: true
      }
    });

    const mapaDocenteCurso: Record<string, any> = {};
    const coloresPorCurso = new Map<number, string>();
    let indexDocente = 1;

    (bloques as any[]).forEach(b => {
      const cursoId = b.componente.oferta.id_curso;
      const key = `${b.id_docente}-${b.componente.id_oferta}`;
      if (!mapaDocenteCurso[key]) {
        if (!coloresPorCurso.has(cursoId)) {
          coloresPorCurso.set(cursoId, obtenerColorCurso(coloresPorCurso.size + 1).slice(2));
        }
        mapaDocenteCurso[key] = {
          indice: indexDocente++,
          color: coloresPorCurso.get(cursoId) ?? obtenerColorCurso(1).slice(2),
          nombre: `${b.docente.apellidos}, ${b.docente.nombres.substring(0,1)}.`,
          nombreCompleto: `${b.docente.apellidos}, ${b.docente.nombres}`,
          cursoNombre: b.componente.oferta.curso.nombre,
          ciclo: b.componente.oferta.id_ciclo,
          tipo: b.componente.tipo,
          grupo: b.grupo.codigo,
          total: 0
        };
      }
      mapaDocenteCurso[key].total += 1;
    });

    for (const key in mapaDocenteCurso) {
      const info = mapaDocenteCurso[key];
      const rowData = [String(info.indice), info.nombre, info.cursoNombre, `${info.ciclo}°`, info.tipo, info.grupo, String(info.total)];
      currentX = tableStartX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(`#${info.color}`).stroke(BORDER_COLOR);
        doc.fillColor('#334155').text(val, currentX, currentY + 2, { width: colWidths[i], align: i === 1 || i === 2 ? 'left' : 'center', ellipsis: true });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    // --- PÁGINA 2: HORARIO COMPLETO (ocupa todo el ancho) ---
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });

    function formatearEtiquetaCeldaAmbiente(registro: any, bloque: any): string {
      let cursoNombre = '';
      if (registro?.cursoNombre) {
        const palabras = registro.cursoNombre.split(' ');
        if (palabras.length > 3) {
          cursoNombre = palabras.map(p => p.charAt(0).toUpperCase()).join('');
        } else {
          cursoNombre = registro.cursoNombre;
        }
      } else if (bloque?.componente?.oferta?.curso?.nombre) {
        const palabras = bloque.componente.oferta.curso.nombre.split(' ');
        if (palabras.length > 3) {
          cursoNombre = palabras.map(p => p.charAt(0).toUpperCase()).join('');
        } else {
          cursoNombre = bloque.componente.oferta.curso.nombre;
        }
      }

      const esTeoria = bloque?.componente?.tipo === 'TEORIA';
      const grupoEtiqueta = (!esTeoria && bloque?.grupo?.codigo) ? `Gr. ${bloque.grupo.codigo}` : '';
      const ambienteEtiqueta = bloque?.ambiente?.codigo || 'Solic.';

      const partes = [String(registro.indice), cursoNombre];
      if (grupoEtiqueta) {
        partes.push(grupoEtiqueta);
      }
      partes.push(ambienteEtiqueta);
      return partes.filter(Boolean).join('\n');
    }

    const celdasPorSlot: Record<string, Array<{ bloque: any; info: any }>> = {};
    for (const bloque of bloques as any[]) {
      const info = mapaDocenteCurso[`${bloque.id_docente}-${bloque.componente.id_oferta}`];
      const slotKey = `${bloque.dia_semana}-${bloque.hora_inicio}`;
      const entradas = celdasPorSlot[slotKey] ?? [];
      entradas.push({ bloque, info });
      celdasPorSlot[slotKey] = entradas;
    }

    const horarioTop = 40;
    const dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridColWidth = (doc.page.width - 80) / 7;
    const gridRowHeight = 32; // Increased height a bit more

    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(leftColX, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
    doc.fillColor('white').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });
    dias.forEach((dia, i) => {
      const x = leftColX + (i + 1) * gridColWidth;
      doc.rect(x, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
      doc.fillColor('white').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
    });

    const slotsOcupados = new Set<string>();
    let y = horarioTop + 15;
    horas.forEach((hora, horaIndex) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });
      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const slotKey = `${dia}-${hora}`;
        if (slotsOcupados.has(slotKey)) {
          return;
        }

        const celdasEnHora = celdasPorSlot[slotKey] ?? [];
        
        doc.rect(x, y, gridColWidth, gridRowHeight).stroke(BORDER_COLOR);
        if (celdasEnHora.length > 0) {
          // Check if all have same curso/docente to merge vertically
          const puedeFusionar = celdasEnHora.length === 1;
          const primerBloque = celdasEnHora[0].bloque;
          const span = puedeFusionar ? calcularFusionPdf(celdasPorSlot, dia, horaIndex, horas, primerBloque) : 1;
          const altoCelda = gridRowHeight * span;

          doc.rect(x, y, gridColWidth, altoCelda).fill(celdasEnHora[0].info?.color || '#FFFFFF').stroke(BORDER_COLOR);

          // Draw each entry separated and vertically centered
          const entryHeight = altoCelda / celdasEnHora.length;
          celdasEnHora.forEach((celda, idx) => {
            const texto = formatearEtiquetaCeldaAmbiente(celda.info, celda.bloque);
            const textoY = y + idx * entryHeight + (entryHeight / 2) - 8; // Vertical center
            doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(6).text(texto, x + 2, textoY, {
              width: gridColWidth - 4,
              align: 'center',
              lineBreak: true
            });
          });

          if (span > 1) {
            for (let offset = 1; offset < span; offset++) {
              slotsOcupados.add(`${dia}-${horas[horaIndex + offset]}`);
            }
          }
        }
      });
      y += gridRowHeight;
    });
  }

  static async generarTodosLosCiclosPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclos = await prisma.ciclo.findMany({ 
      where: { 
        id_periodo: idPeriodo,
        ofertas: { some: {} }
      },
      orderBy: { numero: 'asc' } 
    });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < ciclos.length; i++) {
        if (i > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        await this.generarPaginaCiclo(doc, idPeriodo, ciclos[i].id, periodo, ciclos[i]);
      }
      doc.end();
    });
  }

  static async generarAuditoriaDiaPdf(idPeriodo: number, dia: string): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, dia_semana: dia },
      include: {
        docente: true,
        ambiente: true,
        componente: { include: { oferta: { include: { curso: true } } } }
      },
      orderBy: [
        { id_docente: 'asc' },
        { componente: { id_oferta: 'asc' } },
        { id_ambiente: 'asc' },
        { hora_inicio: 'asc' }
      ]
    });

    const bloquesAgrupados: any[] = [];
    if (bloques.length > 0) {
      let actual = { ...bloques[0] };
      for (let i = 1; i < bloques.length; i++) {
        const b = bloques[i];
        const esContiguo = b.id_docente === actual.id_docente && 
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
      doc.fontSize(14).font('Helvetica-Bold').text(`REPORTE DE AUDITORÍA - ${dia}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Periodo: ${periodo?.nombre} | Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colX = [30, 100, 250, 450, 500, 580, 750];
      const headers = ['HORARIO', 'DOCENTE', 'ASIGNATURA', 'CICLO', 'TIPO', 'AMBIENTE'];
      
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => {
        doc.rect(colX[i], tableTop, colX[i+1] - colX[i], 15).fill('#1E293B').stroke('#1E293B');
        doc.fillColor('white').text(h, colX[i], tableTop + 4, { width: colX[i+1] - colX[i], align: 'center' });
      });

      let currentY = tableTop + 15;
      doc.font('Helvetica').fontSize(8).fillColor('black');

      bloquesAgrupados.forEach((b) => {
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
          b.ambiente?.codigo || 'Por asignar'
        ];

        row.forEach((val, i) => {
          doc.rect(colX[i], currentY, colX[i+1] - colX[i], 15).stroke(BORDER_COLOR);
          doc.text(val, colX[i] + 2, currentY + 4, { width: colX[i+1] - colX[i] - 4, align: i === 1 || i === 2 ? 'left' : 'center', ellipsis: true });
        });
        currentY += 15;
      });

      doc.end();
    });
  }

  static async generarGlobalPdf(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docentes = await prisma.docente.findMany({
      where: { asignaciones: { some: { componente: { oferta: { id_periodo: idPeriodo } } } } },
      orderBy: { apellidos: 'asc' }
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < docentes.length; i++) {
        if (i > 0) doc.addPage({ layout: 'landscape' });
        await this.generarPaginaDocente(doc, idPeriodo, docentes[i].id, periodo, docentes[i]);
      }
      doc.end();
    });
  }
}

type PDFDocumentWithTable = typeof PDFDocument.prototype;
