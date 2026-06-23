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
      declaraciones: {
        where: { id_periodo: idPeriodo },
        include: {
          secciones: true
        },
      },
      bloques_no_lectivos: {
        where: { id_periodo: idPeriodo },
        orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
      }
    },
  });

  if (!docente) throw new Error(`Docente ${idDocente} no encontrado`);

  const horasAsignadas = docente.asignaciones.reduce(
    (s, a) => s + a.horas_asignadas,
    0
  );

  const declaracion = docente.declaraciones.length > 0 ? docente.declaraciones[0] : null;

  return { docente, periodo, horasAsignadas, declaracion };
}

// ---------- PDF helpers ----------
function drawPDFDocenteSection(
  doc: typeof PDFDocument.prototype,
  docente: Awaited<ReturnType<typeof getDocenteData>>['docente'],
  periodo: { nombre: string } | null,
  horasAsignadas: number,
  declaracion: Awaited<ReturnType<typeof getDocenteData>>['declaracion'],
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
    .text(`Categoría: ${docente.categoria}   |   Modalidad: ${docente.modalidad}   |   Horas asignadas (lectivas): ${horasAsignadas}`);
  doc.moveDown(0.5);

  // ---- Carga Lectiva ----
  doc.font('Helvetica-Bold').fontSize(10).text('Carga Lectiva', { underline: true });
  doc.moveDown(0.3);

  // Table header for lectiva
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

  // Table rows for lectiva
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

  doc.moveDown(0.7);

  // ---- Carga No Lectiva ----
  doc.font('Helvetica-Bold').fontSize(10).text('Carga No Lectiva', { underline: true });
  doc.moveDown(0.3);

  if (declaracion?.secciones && declaracion.secciones.length > 0) {
    const secciones = declaracion.secciones;
    doc.font('Helvetica').fontSize(9);
    for (const s of secciones) {
      doc.text(
        `${s.seccion.replace(/_/g, ' ')}: ${s.horas_declaradas} horas${s.descripcion ? ` (${s.descripcion})` : ''}`,
      );
      doc.moveDown(0.2);
    }

    // Now show bloques no lectivos if any
    if (docente.bloques_no_lectivos && docente.bloques_no_lectivos.length > 0) {
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(9).text('Horario No Lectivo:');
      doc.font('Helvetica').fontSize(9);
      doc.moveDown(0.2);

      const colXNoLectiva = [50, 130, 190, 250];
      const colHeadersNoLectiva = ['Día', 'H. Inicio', 'H. Fin', 'Sección'];
      const tableTopNoLectiva = doc.y;

      doc.font('Helvetica-Bold').fontSize(8);
      colHeadersNoLectiva.forEach((h, i) => {
        doc.text(h, colXNoLectiva[i], tableTopNoLectiva, { width: colXNoLectiva[i + 1] ? colXNoLectiva[i + 1] - colXNoLectiva[i] - 4 : 150, ellipsis: true });
      });
      doc.moveDown(0.2);

      const lineYNoLectiva = doc.y;
      doc.moveTo(50, lineYNoLectiva).lineTo(400, lineYNoLectiva).stroke();
      doc.moveDown(0.2);

      const bloquesNoLectivos = [...docente.bloques_no_lectivos];
      sortBloques(bloquesNoLectivos as any);
      for (const b of bloquesNoLectivos) {
        const y = doc.y;
        const cells = [
          b.dia_semana,
          b.hora_inicio,
          b.hora_fin,
          b.seccion.replace(/_/g, ' '),
        ];
        doc.font('Helvetica').fontSize(8);
        cells.forEach((c, i) => {
          doc.text(String(c), colXNoLectiva[i], y, {
            width: colXNoLectiva[i + 1] ? colXNoLectiva[i + 1] - colXNoLectiva[i] - 4 : 150,
            ellipsis: true,
          });
        });
        doc.moveDown(0.3);
      }
    }

  } else {
    doc.font('Helvetica').fontSize(9).text('No hay carga no lectiva registrada para este período.');
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
    const { docente, periodo, horasAsignadas, declaracion } = await getDocenteData(
      idDocente,
      idPeriodo
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawPDFDocenteSection(doc, docente, periodo, horasAsignadas, declaracion, false);
      doc.end();
    });
  }

  // ---- Excel per teacher ----
  static async generarExcelDocente(
    idDocente: number,
    idPeriodo: number
  ): Promise<Buffer> {
    const { docente, horasAsignadas, declaracion } = await getDocenteData(
      idDocente,
      idPeriodo
    );

    const workbook = new ExcelJS.Workbook();
    const sheetName = docente.apellidos.substring(0, 30);
    const ws = workbook.addWorksheet(sheetName);

    // Info row
    ws.addRow([
      `${docente.nombres} ${docente.apellidos}`,
      `Cat: ${docente.categoria}`,
      `Mod: ${docente.modalidad}`,
      `Horas Lectivas: ${horasAsignadas}`,
    ]);
    ws.getRow(1).font = { bold: true, size: 12 };

    ws.addRow([]); // Add space

    // Carga Lectiva
    ws.addRow(['Carga Lectiva']);
    ws.getRow(3).font = { bold: true };

    // Headers for lectiva
    const lectivaColumns = [
      { header: 'Día', key: 'dia', width: 12 },
      { header: 'Hora Inicio', key: 'inicio', width: 12 },
      { header: 'Hora Fin', key: 'fin', width: 12 },
      { header: 'Curso', key: 'curso', width: 35 },
      { header: 'Componente', key: 'componente', width: 15 },
      { header: 'Grupo', key: 'grupo', width: 10 },
      { header: 'Ambiente', key: 'ambiente', width: 12 },
    ];
    
    ws.columns = lectivaColumns as any;
    const headerRowLectiva = ws.addRow(['Día', 'Hora Inicio', 'Hora Fin', 'Curso', 'Componente', 'Grupo', 'Ambiente']);
    headerRowLectiva.font = { bold: true };
    headerRowLectiva.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0E4F7' } };

    // Data rows for lectiva
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

    ws.addRow([]); // Add space

    // Carga No Lectiva
    ws.addRow(['Carga No Lectiva']);
    ws.getRow(ws.lastRow?.number || 0).font = { bold: true };

    if (declaracion?.secciones && declaracion.secciones.length > 0) {
      ws.addRow(['Sección', 'Horas', 'Descripción']);
      const headerRowNoLectiva = ws.getRow(ws.lastRow?.number || 0);
      headerRowNoLectiva.font = { bold: true };
      headerRowNoLectiva.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7E7' } };

      for (const s of declaracion.secciones) {
        ws.addRow([s.seccion.replace(/_/g, ' '), s.horas_declaradas, s.descripcion || '']);
      }

      // Add bloques no lectivos
      if (docente.bloques_no_lectivos && docente.bloques_no_lectivos.length > 0) {
        ws.addRow([]);
        ws.addRow(['Horario No Lectivo']);
        ws.getRow(ws.lastRow?.number || 0).font = { bold: true };
        ws.addRow(['Día', 'Hora Inicio', 'Hora Fin', 'Sección']);
        const headerRowHorarioNoLectivo = ws.getRow(ws.lastRow?.number || 0);
        headerRowHorarioNoLectivo.font = { bold: true };
        headerRowHorarioNoLectivo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0E7FA' } };

        const bloquesNoLectivos = [...docente.bloques_no_lectivos];
        sortBloques(bloquesNoLectivos as any);
        for (const b of bloquesNoLectivos) {
          ws.addRow([b.dia_semana, b.hora_inicio, b.hora_fin, b.seccion.replace(/_/g, ' ')]);
        }
      }
    } else {
      ws.addRow(['No hay carga no lectiva registrada para este período']);
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
        declaraciones: {
          where: { id_periodo: idPeriodo },
          include: { secciones: true },
        },
        bloques_no_lectivos: {
          where: { id_periodo: idPeriodo },
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
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
        const declaracion = d.declaraciones.length > 0 ? d.declaraciones[0] : null;
        drawPDFDocenteSection(doc, d as any, periodo, horasAsignadas, declaracion, idx > 0);
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
        declaraciones: {
          where: { id_periodo: idPeriodo },
          include: { secciones: true },
        },
        bloques_no_lectivos: {
          where: { id_periodo: idPeriodo },
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
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
      const declaracion = d.declaraciones.length > 0 ? d.declaraciones[0] : null;

      ws.addRow([
        `${d.nombres} ${d.apellidos}`,
        `Cat: ${d.categoria}`,
        `Mod: ${d.modalidad}`,
        `Horas Lectivas: ${horasAsignadas}`,
      ]);
      ws.getRow(1).font = { bold: true, size: 12 };

      ws.addRow([]); // Add space

      // Carga Lectiva
      ws.addRow(['Carga Lectiva']);
      ws.getRow(ws.lastRow?.number || 0).font = { bold: true };

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

      ws.addRow([]); // Add space

      // Carga No Lectiva
      ws.addRow(['Carga No Lectiva']);
      ws.getRow(ws.lastRow?.number || 0).font = { bold: true };

      if (declaracion?.secciones && declaracion.secciones.length > 0) {
        ws.addRow(['Sección', 'Horas', 'Descripción']);
        const headerRowNoLectiva = ws.getRow(ws.lastRow?.number || 0);
        headerRowNoLectiva.font = { bold: true };
        headerRowNoLectiva.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7E7' } };

        for (const s of declaracion.secciones) {
          ws.addRow([s.seccion.replace(/_/g, ' '), s.horas_declaradas, s.descripcion || '']);
        }

        // Add bloques no lectivos
        if (d.bloques_no_lectivos && d.bloques_no_lectivos.length > 0) {
          ws.addRow([]);
          ws.addRow(['Horario No Lectivo']);
          ws.getRow(ws.lastRow?.number || 0).font = { bold: true };
          ws.addRow(['Día', 'Hora Inicio', 'Hora Fin', 'Sección']);
          const headerRowHorarioNoLectivo = ws.getRow(ws.lastRow?.number || 0);
          headerRowHorarioNoLectivo.font = { bold: true };
          headerRowHorarioNoLectivo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0E7FA' } };

          const bloquesNoLectivos = [...d.bloques_no_lectivos];
          sortBloques(bloquesNoLectivos as any);
          for (const b of bloquesNoLectivos) {
            ws.addRow([b.dia_semana, b.hora_inicio, b.hora_fin, b.seccion.replace(/_/g, ' ')]);
          }
        }
      } else {
        ws.addRow(['No hay carga no lectiva registrada para este período']);
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

  // ---- Publish Period Method ----
  static async publicarPeriodo(idPeriodo: number) {
    // Update everything to PUBLICADO
    await prisma.$transaction([
      // Update periodo estado
      prisma.periodo_academico.update({
        where: { id: idPeriodo },
        data: { estado: 'PUBLICADO' }
      }),
      // Update all course offers (curso_oferta)
      prisma.curso_oferta.updateMany({
        where: { id_periodo: idPeriodo },
        data: { estado: 'PUBLICADO' }
      }),
      // Update all schedule blocks (bloque_horario)
      prisma.bloque_horario.updateMany({
        where: { id_periodo: idPeriodo },
        data: { estado: 'PUBLICADO' }
      }),
      // Update all non-lective blocks (bloque_no_lectivo)
      prisma.bloque_no_lectivo.updateMany({
        where: { id_periodo: idPeriodo },
        data: { estado: 'PUBLICADO' }
      })
    ]);

    return { mensaje: 'Periodo publicado correctamente' };
  }
}