import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// ---------- helpers ----------
const UNIVERSIDAD = 'Universidad Nacional de Trujillo - Escuela de Ingenieria de Sistemas';

const ordenDias: Record<string, number> = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  DOMINGO: 7,
};

function sortBloques(
  bloques: Array<{ dia_semana: string; hora_inicio: string }>
): void {
  bloques.sort((a, b) => {
    const dA = ordenDias[a.dia_semana] ?? 99;
    const dB = ordenDias[b.dia_semana] ?? 99;
    if (dA !== dB) return dA - dB;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });
}

// ---------- data queries ----------
async function getDocenteData(idDocente: number, idPeriodo: number) {
  const periodo = await prisma.periodo_academico.findUnique({
    where: { id: idPeriodo },
    select: { nombre: true },
  });

  const docente = await prisma.docente.findUnique({
    where: { id: idDocente },
    include: {
      bloques: {
        where: { id_periodo: idPeriodo },
        include: {
          componente: {
            include: {
              oferta: { include: { curso: true } },
            },
          },
          grupo: true,
          ambiente: true,
        },
        orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
      },
      asignaciones: {
        include: {
          componente: {
            include: { oferta: { include: { curso: true } } },
          },
        },
      },
    },
  });

  if (!docente) throw new Error(`Docente ${idDocente} no encontrado`);

  const horasAsignadas = docente.asignaciones.reduce(
    (s, a) => s + a.horas_asignadas,
    0
  );

  return { docente, periodo, horasAsignadas };
}

// ---------- PDF helpers ----------
function drawPDFDocenteSection(
  doc: typeof PDFDocument.prototype,
  docente: Awaited<ReturnType<typeof getDocenteData>>['docente'],
  periodo: { nombre: string } | null,
  horasAsignadas: number,
  addNewPage: boolean
) {
  if (addNewPage) doc.addPage();

  // Header
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(UNIVERSIDAD, { align: 'center' });
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font('Helvetica')
    .text(`Período: ${periodo?.nombre ?? ''}`, { align: 'center' });
  doc.moveDown(0.5);

  // Teacher info
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(`Docente: ${docente.nombres} ${docente.apellidos}`);
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Categoría: ${docente.categoria}   |   Modalidad: ${docente.modalidad}   |   Horas asignadas: ${horasAsignadas}`);
  doc.moveDown(0.5);

  // Table header
  const colX = [50, 130, 190, 285, 375, 440, 500];
  const colHeaders = ['Día', 'H. Inicio', 'H. Fin', 'Curso', 'Componente', 'Grupo', 'Ambiente'];
  const tableTop = doc.y;

  doc.font('Helvetica-Bold').fontSize(9);
  colHeaders.forEach((h, i) => {
    doc.text(h, colX[i], tableTop, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 60, ellipsis: true });
  });
  doc.moveDown(0.2);

  const lineY = doc.y;
  doc.moveTo(50, lineY).lineTo(555, lineY).stroke();
  doc.moveDown(0.2);

  // Table rows
  doc.font('Helvetica').fontSize(9);
  const bloques = [...docente.bloques];
  sortBloques(bloques);

  for (const b of bloques) {
    const y = doc.y;
    const cells = [
      b.dia_semana,
      b.hora_inicio,
      b.hora_fin,
      b.componente?.oferta?.curso?.nombre ?? '',
      b.componente?.tipo ?? '',
      b.grupo?.codigo ?? '',
      b.ambiente?.codigo ?? 'Sin aula',
    ];
    cells.forEach((c, i) => {
      doc.text(String(c), colX[i], y, {
        width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 60,
        ellipsis: true,
      });
    });
    doc.moveDown(0.4);
  }

  // Footer
  const footerY = doc.page.height - 40;
  doc
    .fontSize(8)
    .font('Helvetica')
    .text(`Generado: ${new Date().toLocaleString('es-PE')}`, 50, footerY, {
      align: 'left',
    });
}

// ============================
// ReportesService
// ============================
export class ReportesService {
  // ---- PDF per teacher ----
  static async generarPDFDocente(
    idDocente: number,
    idPeriodo: number
  ): Promise<Buffer> {
    const { docente, periodo, horasAsignadas } = await getDocenteData(
      idDocente,
      idPeriodo
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawPDFDocenteSection(doc, docente, periodo, horasAsignadas, false);
      doc.end();
    });
  }

  // ---- Excel per teacher ----
  static async generarExcelDocente(
    idDocente: number,
    idPeriodo: number
  ): Promise<Buffer> {
    const { docente, horasAsignadas } = await getDocenteData(
      idDocente,
      idPeriodo
    );

    const workbook = new ExcelJS.Workbook();
    const sheetName = docente.apellidos.substring(0, 30);
    const ws = workbook.addWorksheet(sheetName);

    // Headers
    ws.columns = [
      { header: 'Día', key: 'dia', width: 12 },
      { header: 'Hora Inicio', key: 'inicio', width: 12 },
      { header: 'Hora Fin', key: 'fin', width: 12 },
      { header: 'Curso', key: 'curso', width: 35 },
      { header: 'Componente', key: 'componente', width: 15 },
      { header: 'Grupo', key: 'grupo', width: 10 },
      { header: 'Ambiente', key: 'ambiente', width: 12 },
    ];

    // Bold header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD0E4F7' },
    };

    // Info row
    ws.insertRow(1, [
      `${docente.nombres} ${docente.apellidos}`,
      `Cat: ${docente.categoria}`,
      `Mod: ${docente.modalidad}`,
      `Horas: ${horasAsignadas}`,
    ]);
    ws.getRow(1).font = { bold: true, size: 12 };

    // Data rows (after header which is now row 2)
    const bloques = [...docente.bloques];
    sortBloques(bloques);

    for (const b of bloques) {
      ws.addRow({
        dia: b.dia_semana,
        inicio: b.hora_inicio,
        fin: b.hora_fin,
        curso: b.componente?.oferta?.curso?.nombre ?? '',
        componente: b.componente?.tipo ?? '',
        grupo: b.grupo?.codigo ?? '',
        ambiente: b.ambiente?.codigo ?? 'Sin aula',
      });
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ---- PDF global (all teachers in period) ----
  static async generarPDFGlobal(idPeriodo: number): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({
      where: { id: idPeriodo },
      select: { nombre: true },
    });

    const docentes = await prisma.docente.findMany({
      where: {
        activo: true,
        bloques: { some: { id_periodo: idPeriodo } },
      },
      include: {
        bloques: {
          where: { id_periodo: idPeriodo },
          include: {
            componente: {
              include: { oferta: { include: { curso: true } } },
            },
            grupo: true,
            ambiente: true,
          },
        },
        asignaciones: true,
      },
      orderBy: [
        { modalidad: 'asc' },
        { categoria: 'asc' },
        { apellidos: 'asc' },
      ],
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      docentes.forEach((d, idx) => {
        const horasAsignadas = d.asignaciones.reduce(
          (s, a) => s + a.horas_asignadas,
          0
        );
        drawPDFDocenteSection(doc, d as any, periodo, horasAsignadas, idx > 0);
      });

      doc.end();
    });
  }

  // ---- Excel global (all teachers in period) ----
  static async generarExcelGlobal(idPeriodo: number): Promise<Buffer> {
    const docentes = await prisma.docente.findMany({
      where: {
        activo: true,
        bloques: { some: { id_periodo: idPeriodo } },
      },
      include: {
        bloques: {
          where: { id_periodo: idPeriodo },
          include: {
            componente: {
              include: { oferta: { include: { curso: true } } },
            },
            grupo: true,
            ambiente: true,
          },
        },
        asignaciones: true,
      },
      orderBy: [
        { modalidad: 'asc' },
        { categoria: 'asc' },
        { apellidos: 'asc' },
      ],
    });

    const workbook = new ExcelJS.Workbook();

    for (const d of docentes) {
      const sheetName = d.apellidos.substring(0, 30);
      const ws = workbook.addWorksheet(sheetName);

      const horasAsignadas = d.asignaciones.reduce(
        (s, a) => s + a.horas_asignadas,
        0
      );

      ws.addRow([
        `${d.nombres} ${d.apellidos}`,
        `Cat: ${d.categoria}`,
        `Mod: ${d.modalidad}`,
        `Horas: ${horasAsignadas}`,
      ]);
      ws.getRow(1).font = { bold: true, size: 12 };

      ws.columns = [
        { key: 'dia', width: 12 },
        { key: 'inicio', width: 12 },
        { key: 'fin', width: 12 },
        { key: 'curso', width: 35 },
        { key: 'componente', width: 15 },
        { key: 'grupo', width: 10 },
        { key: 'ambiente', width: 12 },
      ];

      const headerRow = ws.addRow(['Día', 'Hora Inicio', 'Hora Fin', 'Curso', 'Componente', 'Grupo', 'Ambiente']);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD0E4F7' },
      };

      const bloques = [...d.bloques];
      sortBloques(bloques);

      for (const b of bloques) {
        ws.addRow([
          b.dia_semana,
          b.hora_inicio,
          b.hora_fin,
          b.componente?.oferta?.curso?.nombre ?? '',
          b.componente?.tipo ?? '',
          b.grupo?.codigo ?? '',
          b.ambiente?.codigo ?? 'Sin aula',
        ]);
      }
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ---- Legacy queue-based methods (keep for backward compat) ----
  static async solicitarGeneracion(tipo: string, parametros: any) {
    const { colaReportes } = await import('@/cola/cola-reportes');
    const trabajo = await colaReportes.add('generar-reporte', { tipo, parametros });
    return { jobId: trabajo.id };
  }

  static async obtenerEstado(jobId: string) {
    const { colaReportes } = await import('@/cola/cola-reportes');
    const trabajo = await colaReportes.getJob(jobId);
    if (!trabajo) throw new Error('Trabajo no encontrado');

    const estado = await trabajo.getState();
    const resultado = { estado, progreso: trabajo.progress };

    if (estado === 'completed') {
      const fs = await import('fs');
      const path = await import('path');
      const pdfPath = path.join(process.cwd(), 'reportes', `${jobId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        return { ...resultado, descargable: true, ruta: `/api/reportes/descargar/${jobId}` };
      }
    }

    return resultado;
  }

  static obtenerPDF(jobId: string): string | null {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const pdfPath = path.join(process.cwd(), 'reportes', `${jobId}.pdf`);
    if (fs.existsSync(pdfPath)) return pdfPath;
    return null;
  }
}