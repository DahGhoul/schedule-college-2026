import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import { crearContextoHorarioCiclo, formatearEtiquetaCelda } from './horario-ciclo.utils';

function formatearFranjaHora(horaInicio: string): string {
  const [horas, minutos] = horaInicio.split(':');
  const horaFinal = String(Number(horas) + 1).padStart(2, '0');
  return `${Number(horas)}:${minutos} - ${Number(horaFinal)}:${minutos}`;
}

export class GeneradorPdfService {
  static async generarHorarioPdf(idPeriodo: number, idCiclo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclo = await prisma.ciclo.findUnique({ where: { id: idCiclo } });
    
    const doc = new PDFDocument({ 
      margin: 40, 
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
    const coloresPasteles = [
      '#F0F9FF', '#F5F3FF', '#ECFDF5', '#FFFBEB', '#FFF1F2',
      '#EFF6FF', '#F5F5F4', '#F0FDFA', '#FAF0FF', '#FDF2F8'
    ];

    const leftColX = 30;
    const rightColX = 220;
    const topMargin = 30;
    const pageWidth = doc.page.width - 60;

    // --- 1. CABECERA ---
    doc.fontSize(10).font('Helvetica-Bold').text('UNIVERSIDAD NACIONAL DE TRUJILLO', leftColX, topMargin, { width: 170, align: 'center' });
    doc.fontSize(9).text('FACULTAD DE INGENIERÍA', leftColX, topMargin + 12, { width: 170, align: 'center' });
    doc.text('ESCUELA DE INGENIERÍA DE SISTEMAS', leftColX, topMargin + 24, { width: 170, align: 'center' });
    
    doc.fontSize(8).font('Helvetica');
    doc.font('Helvetica-Bold').text(`DOCENTE: ${docente?.apellidos}, ${docente?.nombres}`, leftColX, topMargin + 45);
    doc.font('Helvetica').text(`CATEGORÍA: ${docente?.categoria}`, leftColX, topMargin + 55);
    doc.text(`MODALIDAD: ${docente?.modalidad}`, leftColX, topMargin + 65);
    doc.text(`SEMESTRE: ${periodo?.nombre}`, leftColX, topMargin + 75);
    doc.text(`FECHA: ${new Date().toLocaleDateString('es-PE')}`, leftColX, topMargin + 85);

    // --- 2. TABLA DETALLE ---
    const detailHeaders = ['N°', 'ASIGNATURA', 'CICLO', 'T', 'L', 'GRP', 'TOT'];
    const colWidths = [15, 180, 30, 20, 20, 30, 25];
    let currentY = topMargin;
    
    doc.font('Helvetica-Bold').fontSize(7);
    let currentX = rightColX;
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

    for (const asig of asignaciones) {
      const cursoId = asig.componente.oferta.id_curso;
      if (!mapaCursos[cursoId]) {
        mapaCursos[cursoId] = {
          indice: indexCurso++,
          color: coloresPasteles[(indexCurso - 2) % coloresPasteles.length],
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

    for (const cid in mapaCursos) {
      const info = mapaCursos[cid];
      const rowData = [String(info.indice), info.nombre, `${info.ciclo}°`, String(info.teo), String(info.lab), String(info.grupos), String(info.total)];
      currentX = rightColX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(info.color).stroke('#E2E8F0');
        doc.fillColor('#334155').text(val, currentX, currentY + 2, { width: colWidths[i], align: 'center', ellipsis: true });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    // --- 3. HORARIO ---
    const horarioTop = Math.max(currentY + 20, 140);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridColWidth = pageWidth / 7;
    const gridRowHeight = 20;

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

    let y = horarioTop + 15;
    horas.forEach((hora) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });

      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const celdasEnHora = bloques.filter(b => b.dia_semana === dia && b.hora_inicio === hora);
        
        doc.rect(x, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
        if (celdasEnHora.length > 0) {
          const numCols = Math.min(celdasEnHora.length, 2);
          const colW = (gridColWidth - 2) / numCols;

          celdasEnHora.slice(0, 2).forEach((bloque, bIdx) => {
            const entryX = x + 1 + (bIdx * colW);
            const info = mapaCursos[bloque.componente.id_oferta];
            doc.rect(entryX, y + 1, colW, gridRowHeight - 2).fill(info?.color || '#FFFFFF');
            
            doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(String(info?.indice || '?'), entryX, y + 3, { width: colW, align: 'center' });
            const ambienteCodigo = (bloque as any).ambiente?.codigo || 'Solic.';
            doc.fontSize(5).font('Helvetica').text(`(${ambienteCodigo})`, entryX, y + 12, { width: colW, align: 'center' });
          });
        }
      });
      y += gridRowHeight;
    });
  }

  private static async generarPaginaCiclo(doc: PDFDocumentWithTable, idPeriodo: number, idCiclo: number, periodo: any, ciclo: any) {
    const topMargin = 40;
    const leftColX = 40;
    const rightColX = 285;
    const pageWidth = doc.page.width - 80;
    const headerBoxWidth = 205;
    const headerBoxHeight = 118;

    doc.roundedRect(leftColX - 6, topMargin - 6, headerBoxWidth, headerBoxHeight, 4).stroke('#CBD5E1');
    doc.fontSize(10).font('Helvetica-Bold').text('UNIVERSIDAD NACIONAL DE TRUJILLO', leftColX, topMargin, { width: headerBoxWidth - 12, align: 'center' });
    doc.fontSize(9).text('FACULTAD DE INGENIERÍA', leftColX, topMargin + 12, { width: headerBoxWidth - 12, align: 'center' });
    doc.text('ESCUELA DE INGENIERÍA DE SISTEMAS', leftColX, topMargin + 24, { width: headerBoxWidth - 12, align: 'center' });

    doc.fontSize(8).font('Helvetica');
    doc.text(`CICLO: ${ciclo?.numero}°`, leftColX, topMargin + 45, { width: headerBoxWidth - 12, align: 'center' });
    doc.text('SECCIÓN: ÚNICA', leftColX, topMargin + 55, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`AÑO ACADÉMICO: ${new Date().getFullYear()}`, leftColX, topMargin + 65, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`SEMESTRE: ${periodo?.nombre}`, leftColX, topMargin + 75, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`INICIO DEL CICLO: ${periodo?.fecha_inicio ? new Date(periodo.fecha_inicio).toLocaleDateString('es-PE') : '-'}`, leftColX, topMargin + 85, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`TÉRMINO DEL CICLO: ${periodo?.fecha_fin ? new Date(periodo.fecha_fin).toLocaleDateString('es-PE') : '-'}`, leftColX, topMargin + 95, { width: headerBoxWidth - 12, align: 'center' });

    const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T.HORAS', 'DEPARTAMENTO'];
    const colWidths = [14, 144, 92, 16, 16, 16, 16, 24, 59];
    let currentY = topMargin;
    let currentX = rightColX;

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

    const contexto = crearContextoHorarioCiclo(bloques as any);

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

      currentX = rightColX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(`#${info.color.slice(2)}`).stroke('#E2E8F0');
        doc.fillColor('#334155').text(val, currentX, currentY + 2, {
          width: colWidths[i],
          height: 10,
          align: 'center',
          ellipsis: true,
          lineBreak: false
        });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    const horarioTop = Math.max(currentY + 24, topMargin + headerBoxHeight + 18);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const horas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    const gridColWidth = Math.min((doc.page.width - (leftColX * 2)) / 7, 125);
    const gridRowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(leftColX, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
    doc.fillColor('white').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });

    dias.forEach((dia, i) => {
      const x = leftColX + (i + 1) * gridColWidth;
      doc.rect(x, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
      doc.fillColor('white').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
    });

    let y = horarioTop + 15;
    horas.forEach((hora) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });

      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const entradas = contexto.celdas[`${dia}-${hora}`] ?? [];

        doc.rect(x, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
        if (entradas.length > 0) {
          const numCols = Math.min(entradas.length, 2);
          const colW = (gridColWidth - 2) / numCols;
          
          entradas.slice(0, 2).forEach((entrada, eIdx) => {
            const entryX = x + 1 + (eIdx * colW);
            doc.rect(entryX, y + 1, colW, gridRowHeight - 2).fill(`#${entrada.registro.color.slice(2)}`);
            const texto = formatearEtiquetaCelda(entrada.registro, entrada.bloque);
            doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(6).text(texto, entryX, y + 3, { 
              width: colW, 
              align: 'center',
              lineBreak: true
            });
          });
        }
      });

      y += gridRowHeight;
    });
  }

  static async generarHorarioAmbientePdf(idPeriodo: number, idAmbiente: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'portrait' });
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
        if (i > 0) doc.addPage();
        await this.generarPaginaAmbiente(doc, idPeriodo, ambientes[i].id, periodo, ambientes[i]);
      }
      doc.end();
    });
  }

  private static async generarPaginaAmbiente(doc: PDFDocumentWithTable, idPeriodo: number, idAmbiente: number, periodo: any, ambiente: any) {
    const coloresPasteles = ['#F0F9FF', '#F5F3FF', '#ECFDF5', '#FFFBEB', '#FFF1F2', '#EFF6FF', '#F5F5F4', '#F0FDFA', '#FAF0FF', '#FDF2F8'];
    const leftColX = 30;
    const rightColX = 220;
    const topMargin = 30;
    const pageWidth = doc.page.width - 60;
    const headerBoxWidth = 205;

    // 1. CABECERA
    doc.fontSize(10).font('Helvetica-Bold').text('UNIVERSIDAD NACIONAL DE TRUJILLO', leftColX, topMargin);
    doc.fontSize(9).text('FACULTAD DE INGENIERÍA', leftColX, topMargin + 12);
    doc.text('ESCUELA DE INGENIERÍA DE SISTEMAS', leftColX, topMargin + 24);
    
    doc.fontSize(8).font('Helvetica');
    doc.font('Helvetica-Bold').text(`AMBIENTE: ${ambiente?.codigo} (${ambiente?.tipo})`, leftColX, topMargin + 45, { width: headerBoxWidth - 12, align: 'center' });
    doc.font('Helvetica').text(`CAPACIDAD: ${ambiente?.capacidad} personas`, leftColX, topMargin + 55, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`SEMESTRE: ${periodo?.nombre}`, leftColX, topMargin + 65, { width: headerBoxWidth - 12, align: 'center' });
    doc.text(`FECHA: ${new Date().toLocaleDateString('es-PE')}`, leftColX, topMargin + 75, { width: headerBoxWidth - 12, align: 'center' });

    // 2. TABLA DETALLE
    const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'CICLO', 'TIPO', 'G', 'TOT'];
    const colWidths = [15, 90, 130, 30, 30, 20, 25];
    let currentY = topMargin;
    
    doc.font('Helvetica-Bold').fontSize(7);
    let currentX = rightColX;
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
    let indexDocente = 1;

    bloques.forEach(b => {
      const key = `${b.id_docente}-${b.componente.id_oferta}`;
      if (!mapaDocenteCurso[key]) {
        mapaDocenteCurso[key] = {
          indice: indexDocente++,
          color: coloresPasteles[(indexDocente - 2) % coloresPasteles.length],
          nombre: `${b.docente.apellidos}, ${b.docente.nombres.substring(0,1)}.`,
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
      currentX = rightColX;
      doc.font('Helvetica').fontSize(6).fillColor('black');
      rowData.forEach((val, i) => {
        doc.rect(currentX, currentY, colWidths[i], 10).fill(info.color).stroke('#E2E8F0');
        doc.fillColor('#334155').text(val, currentX, currentY + 2, { width: colWidths[i], align: i === 1 || i === 2 ? 'left' : 'center', ellipsis: true });
        currentX += colWidths[i];
      });
      currentY += 10;
    }

    // 3. HORARIO
    const horarioTop = Math.max(currentY + 20, 140);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridColWidth = pageWidth / 7;
    const gridRowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(leftColX, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
    doc.fillColor('white').text('HORA', leftColX, horarioTop + 3, { width: gridColWidth, align: 'center' });
    dias.forEach((dia, i) => {
      const x = leftColX + (i + 1) * gridColWidth;
      doc.rect(x, horarioTop, gridColWidth, 15).fill('#334155').stroke('#334155');
      doc.fillColor('white').text(dia, x, horarioTop + 3, { width: gridColWidth, align: 'center' });
    });

    let y = horarioTop + 15;
    horas.forEach((hora) => {
      doc.rect(leftColX, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(formatearFranjaHora(hora), leftColX, y + 8, { width: gridColWidth, align: 'center' });
      dias.forEach((dia, dIdx) => {
        const x = leftColX + (dIdx + 1) * gridColWidth;
        const celdasEnHora = bloques.filter(b => b.dia_semana === dia && b.hora_inicio === hora);
        
        doc.rect(x, y, gridColWidth, gridRowHeight).stroke('#E2E8F0');
        if (celdasEnHora.length > 0) {
          const numCols = Math.min(celdasEnHora.length, 2);
          const colW = (gridColWidth - 2) / numCols;

          celdasEnHora.slice(0, 2).forEach((bloque, bIdx) => {
            const entryX = x + 1 + (bIdx * colW);
            const info = mapaDocenteCurso[`${bloque.id_docente}-${bloque.componente.id_oferta}`];
            doc.rect(entryX, y + 1, colW, gridRowHeight - 2).fill(info?.color || '#FFFFFF');
            
            doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7).text(String(info?.indice || '?'), entryX, y + 3, { width: colW, align: 'center' });
            // Verificamos si existe la propiedad ambiente antes de acceder a ella
            const ambienteCodigo = (bloque as any).ambiente?.codigo || 'Solic.';
            doc.fontSize(5).font('Helvetica').text(`(${ambienteCodigo})`, entryX, y + 12, { width: colW, align: 'center' });
          });
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
        ofertas: { some: {} } // Solo ciclos con oferta
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
        if (i > 0) doc.addPage({ layout: 'landscape' });
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

    // Lógica de agrupación de bloques contiguos
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
          doc.rect(colX[i], currentY, colX[i+1] - colX[i], 15).stroke('#E2E8F0');
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

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'portrait' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      for (let i = 0; i < docentes.length; i++) {
        if (i > 0) doc.addPage();
        await this.generarPaginaDocente(doc, idPeriodo, docentes[i].id, periodo, docentes[i]);
      }
      doc.end();
    });
  }
}

type PDFDocumentWithTable = typeof PDFDocument.prototype;
