import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { crearContextoHorarioCiclo, formatearEtiquetaCelda } from './horario-ciclo.utils';

export class GeneradorExcelService {
  static async generarHorarioExcel(idPeriodo: number, idCiclo: number) {
    const workbook = new ExcelJS.Workbook();
    await this.agregarHojaCiclo(workbook, idPeriodo, idCiclo);
    return workbook.xlsx.writeBuffer();
  }

  static async generarTodosLosCiclosExcel(idPeriodo: number) {
    const workbook = new ExcelJS.Workbook();
    const ciclos = await prisma.ciclo.findMany({ orderBy: { numero: 'asc' } });
    
    for (const ciclo of ciclos) {
      await this.agregarHojaCiclo(workbook, idPeriodo, ciclo.id);
    }
    
    return workbook.xlsx.writeBuffer();
  }

  private static async agregarHojaCiclo(workbook: ExcelJS.Workbook, idPeriodo: number, idCiclo: number) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclo = await prisma.ciclo.findUnique({ where: { id: idCiclo } });
    const sheetName = `Ciclo ${ciclo?.numero}`;
    const worksheet = workbook.addWorksheet(sheetName, {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
         fitToWidth: 1,
         margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
       }
     });

    // Definir columnas para cabecera, detalle y grilla
    const colWidths = [15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
    colWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });

    // --- FILA 1: CABECERA Y DETALLE ---
    
    // 1.1 Datos Generales (Izquierda 1/3 -> Columnas A-D)
    const headerRows = [
      ['UNIVERSIDAD NACIONAL DE TRUJILLO'],
      ['FACULTAD DE INGENIERÍA'],
      ['ESCUELA DE INGENIERÍA DE SISTEMAS'],
      [''],
      [`CICLO: ${ciclo?.numero}°`],
      ['SECCIÓN: ÚNICA'],
      [`AÑO ACADÉMICO: ${new Date().getFullYear()}`],
      [`SEMESTRE: ${periodo?.nombre}`],
      [`INICIO DEL CICLO: ${periodo?.fecha_inicio ? new Date(periodo.fecha_inicio).toLocaleDateString('es-PE') : '-'}`],
      [`TÉRMINO DEL CICLO: ${periodo?.fecha_fin ? new Date(periodo.fecha_fin).toLocaleDateString('es-PE') : '-'}`]
    ];

    headerRows.forEach((row, i) => {
      worksheet.mergeCells(i + 1, 1, i + 1, 4);
      const cell = worksheet.getCell(i + 1, 1);
      cell.value = row[0];
      cell.font = { bold: i < 3, size: i < 3 ? 10 : 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 1.2 Tabla de Detalle (Derecha 2/3 -> Columnas E-L)
    const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T.HORAS', 'DEPARTAMENTO'];
    const detailStartRow = 1;
    const detailCols = [5, 6, 7, 8, 9, 10, 11, 12, 13];
    
    // Anchos específicos para la tabla de detalle
    worksheet.getColumn(5).width = 4;   // N°
    worksheet.getColumn(6).width = 25;  // PROFESOR
    worksheet.getColumn(7).width = 28;  // ASIGNATURA
    worksheet.getColumn(8).width = 5;   // T
    worksheet.getColumn(9).width = 5;   // P
    worksheet.getColumn(10).width = 5;  // L
    worksheet.getColumn(11).width = 5;  // G
    worksheet.getColumn(12).width = 7;  // T.HORAS
    worksheet.getColumn(13).width = 18; // DEPARTAMENTO

    detailHeaders.forEach((h, i) => {
      const cell = worksheet.getCell(detailStartRow, detailCols[i]);
      cell.value = h;
      cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const bloques = await prisma.bloque_horario.findMany({
      where: {
        id_periodo: idPeriodo,
        componente: { oferta: { id_ciclo: idCiclo, id_periodo: idPeriodo } }
      },
      include: {
        docente: true,
        ambiente: true,
        grupo: true,
        componente: {
          include: {
            oferta: { include: { curso: true } }
          }
        }
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

    let currentRowDetail = detailStartRow + 1;
    for (const info of contexto.registros) {
      const data = [
        info.indice,
        info.docenteNombre,
        info.cursoNombre,
        info.teoria,
        info.practica,
        info.laboratorio,
        info.grupoCodigo,
        info.totalHoras,
        info.departamento
      ];

      data.forEach((val, i) => {
        const cell = worksheet.getCell(currentRowDetail, detailCols[i]);
        cell.value = val;
        cell.font = { size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.color } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRowDetail++;
    }

    // --- FILA 2: HORARIO ---
    const startRowHorario = Math.max(currentRowDetail + 2, 12);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    // Header horario (A-L -> 12 cols, 2 por día aprox)
    // Col 1-2: Hora, Col 3-4: Lunes, Col 5-6: Martes, Col 7-8: Miércoles, Col 9-10: Jueves, Col 11-12: Viernes
    const gridCols = [
      { start: 1, end: 2, label: 'HORA' },
      { start: 3, end: 4, label: 'LUNES' },
      { start: 5, end: 6, label: 'MARTES' },
      { start: 7, end: 8, label: 'MIÉRCOLES' },
      { start: 9, end: 10, label: 'JUEVES' },
      { start: 11, end: 12, label: 'VIERNES' }
    ];

    gridCols.forEach(col => {
      worksheet.mergeCells(startRowHorario, col.start, startRowHorario, col.end);
      const cell = worksheet.getCell(startRowHorario, col.start);
      cell.value = col.label;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    horas.forEach((hora, hIdx) => {
      const row = startRowHorario + 1 + hIdx;
      worksheet.mergeCells(row, 1, row, 2);
      const hourCell = worksheet.getCell(row, 1);
      hourCell.value = hora;
      hourCell.font = { bold: true, size: 8 };
      hourCell.alignment = { horizontal: 'center', vertical: 'middle' };
      hourCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      worksheet.getRow(row).height = 25; // Altura más pequeña

      dias.forEach((dia, dIdx) => {
        const colStart = gridCols[dIdx + 1].start;
        const colEnd = gridCols[dIdx + 1].end;
        worksheet.mergeCells(row, colStart, row, colEnd);
        const cell = worksheet.getCell(row, colStart);
        
        const entradas = contexto.celdas[`${dia}-${hora}`] ?? [];
        if (entradas.length > 0) {
          cell.value = entradas.map(({ registro, bloque }) => formatearEtiquetaCelda(registro, bloque)).join('\n\n');
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: entradas[0].registro.color } };
          cell.font = { bold: true, size: 8 };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
  }

  static async generarHorarioAmbienteExcel(idPeriodo: number, idAmbiente: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await this.agregarHojaAmbiente(workbook, idPeriodo, idAmbiente);
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  static async generarTodosLosAmbientesExcel(idPeriodo: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const ambientes = await prisma.ambiente.findMany({ 
      where: { activo: true },
      orderBy: { codigo: 'asc' } 
    });
    
    for (const amb of ambientes) {
      await this.agregarHojaAmbiente(workbook, idPeriodo, amb.id);
    }
    
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private static async agregarHojaAmbiente(workbook: ExcelJS.Workbook, idPeriodo: number, idAmbiente: number) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    const sheetName = `${ambiente?.codigo}`.substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName, {
      pageSetup: { 
        paperSize: 9, 
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
      }
    });

    const colWidths = [15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
    colWidths.forEach((w, i) => worksheet.getColumn(i + 1).width = w);

    // 1. CABECERA
    const headers = [
      ['UNIVERSIDAD NACIONAL DE TRUJILLO'], ['FACULTAD DE INGENIERÍA'], ['ESCUELA DE INGENIERÍA DE SISTEMAS'], [''],
      [`AMBIENTE: ${ambiente?.codigo} (${ambiente?.tipo})`], [`CAPACIDAD: ${ambiente?.capacidad} personas`],
      [`SEMESTRE: ${periodo?.nombre}`], [`FECHA: ${new Date().toLocaleDateString('es-PE')}`]
    ];
    headers.forEach((h, i) => {
      worksheet.mergeCells(i + 1, 1, i + 1, 4);
      const cell = worksheet.getCell(i + 1, 1);
      cell.value = h[0];
      cell.font = { bold: i < 3 || i === 4, size: i < 3 ? 10 : 9 };
    });

    // 2. TABLA DETALLE
    const detailHeaders = ['N°', 'PROFESOR', 'ASIGNATURA', 'CICLO', 'TIPO', 'GRUPO', 'TOTAL'];
    const detailCols = [5, 6, 7, 8, 9, 10, 11];
    worksheet.getColumn(5).width = 4; worksheet.getColumn(6).width = 50; worksheet.getColumn(7).width = 30;
    
    detailHeaders.forEach((h, i) => {
      const cell = worksheet.getCell(1, detailCols[i]);
      cell.value = h;
      cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, id_ambiente: idAmbiente, estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] } },
      include: {
        docente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        grupo: true
      }
    });

    const coloresPasteles = ['FFF0F9FF', 'FFF5F3FF', 'FFECFDF5', 'FFFFFBEB', 'FFFFF1F2', 'FFEFF6FF', 'FFF5F5F4', 'FFF0FDFA', 'FFFFFAF0', 'FFFDF2F8'];
    const mapaDocenteCurso: Record<string, any> = {};
    let indexDocente = 1;

    bloques.forEach(b => {
      const key = `${b.id_docente}-${b.componente.id_oferta}`;
      if (!mapaDocenteCurso[key]) {
        mapaDocenteCurso[key] = {
          indice: indexDocente++,
          color: coloresPasteles[(indexDocente - 2) % coloresPasteles.length].replace('FF', ''),
          nombre: `${b.docente.apellidos}, ${b.docente.nombres.substring(0,1)}.`,
          cursoNombre: b.componente.oferta.curso.nombre,
          ciclo: b.componente.oferta.id_ciclo,
          tipo: b.componente.tipo,
          grupo: b.grupo.codigo,
          total: 0
        };
      }
      mapaDocenteCurso[key].total += 1; // Cada bloque es 1 hora
    });

    let currentRow = 2;
    for (const key in mapaDocenteCurso) {
      const info = mapaDocenteCurso[key];
      const data = [info.indice, info.nombre, info.cursoNombre, `${info.ciclo}°`, info.tipo, info.grupo, info.total];
      data.forEach((val, i) => {
        const cell = worksheet.getCell(currentRow, detailCols[i]);
        cell.value = val;
        cell.font = { size: 8 };
        if (i === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + info.color } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;
    }

    // 3. HORARIO
    const startRowHorario = Math.max(currentRow + 2, 12);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridCols = [{ s: 1, e: 2, l: 'HORA' }, { s: 3, e: 4, l: 'LUNES' }, { s: 5, e: 6, l: 'MARTES' }, { s: 7, e: 8, l: 'MIÉRCOLES' }, { s: 9, e: 10, l: 'JUEVES' }, { s: 11, e: 12, l: 'VIERNES' }];

    gridCols.forEach(col => {
      worksheet.mergeCells(startRowHorario, col.s, startRowHorario, col.e);
      const cell = worksheet.getCell(startRowHorario, col.s);
      cell.value = col.l;
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
    });

    horas.forEach((h, i) => {
      const row = startRowHorario + 1 + i;
      worksheet.mergeCells(row, 1, row, 2);
      worksheet.getCell(row, 1).value = h;
      worksheet.getCell(row, 1).font = { bold: true, size: 8 };
      worksheet.getRow(row).height = 25;

      dias.forEach((d, di) => {
        const cs = gridCols[di + 1].s, ce = gridCols[di + 1].e;
        worksheet.mergeCells(row, cs, row, ce);
        const cell = worksheet.getCell(row, cs);
        const b = bloques.find(bl => bl.dia_semana === d && bl.hora_inicio === h);
        if (b) {
          const info = mapaDocenteCurso[`${b.id_docente}-${b.componente.id_oferta}`];
          cell.value = `${info?.indice || '?'}\n(Ciclo: ${b.componente.oferta.id_ciclo}°)`;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (info?.color || 'FFFFFF') } };
          cell.font = { bold: true, size: 8 };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
  }

  static async generarHorarioDocenteExcel(idPeriodo: number, idDocente: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docente = await prisma.docente.findUnique({ where: { id: idDocente } });
    
    await this.generarHojaDocente(workbook, idPeriodo, idDocente, periodo, docente);
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  static async generarGlobalExcel(idPeriodo: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const docentes = await prisma.docente.findMany({
      where: { asignaciones: { some: { componente: { oferta: { id_periodo: idPeriodo } } } } },
      orderBy: { apellidos: 'asc' }
    });

    for (const d of docentes) {
      await this.generarHojaDocente(workbook, idPeriodo, d.id, periodo, d);
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private static async generarHojaDocente(workbook: ExcelJS.Workbook, idPeriodo: number, idDocente: number, periodo: any, docente: any) {
    const ws = workbook.addWorksheet(`${docente.apellidos.substring(0,10)}`, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
    });

    const colWidths = [15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
    colWidths.forEach((w, i) => ws.getColumn(i + 1).width = w);

    // 1. CABECERA
    const headers = [
      ['UNIVERSIDAD NACIONAL DE TRUJILLO'], ['FACULTAD DE INGENIERÍA'], ['ESCUELA DE INGENIERÍA DE SISTEMAS'], [''],
      [`DOCENTE: ${docente?.apellidos}, ${docente?.nombres}`], [`CATEGORÍA: ${docente?.categoria}`], [`MODALIDAD: ${docente?.modalidad}`],
      [`SEMESTRE: ${periodo?.nombre}`], [`FECHA: ${new Date().toLocaleDateString('es-PE')}`]
    ];
    headers.forEach((h, i) => {
      ws.mergeCells(i + 1, 1, i + 1, 4);
      const cell = ws.getCell(i + 1, 1);
      cell.value = h[0];
      cell.font = { bold: i < 3 || i === 4, size: i < 3 ? 10 : 9 };
    });

    // 2. TABLA DETALLE
    const detailHeaders = ['N°', 'ASIGNATURA', 'CICLO', 'T', 'L', 'GRP', 'TOTAL', 'DEP.'];
    const detailCols = [5, 6, 7, 8, 9, 10, 11, 12];
    ws.getColumn(5).width = 4; ws.getColumn(6).width = 30; ws.getColumn(7).width = 8;
    
    detailHeaders.forEach((h, i) => {
      const cell = ws.getCell(1, detailCols[i]);
      cell.value = h;
      cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const asignaciones = await prisma.asignacion_docente_componente.findMany({
      where: { id_docente: idDocente, componente: { oferta: { id_periodo: idPeriodo } } },
      include: { componente: { include: { oferta: { include: { curso: true } }, grupos: true } } }
    });

    const coloresPasteles = ['FFF0F9FF', 'FFF5F3FF', 'FFECFDF5', 'FFFFFBEB', 'FFFFF1F2', 'FFEFF6FF', 'FFF5F5F4', 'FFF0FDFA', 'FFFFFAF0', 'FFFDF2F8'];
    const mapaCursos: Record<number, { indice: number; color: string; nombre: string; ciclo: number; teo: number; lab: number; grupos: number; total: number }> = {};
    let indexCurso = 1;

    for (const asig of asignaciones) {
      const cursoId = asig.componente.oferta.id_curso;
      if (!mapaCursos[cursoId]) {
        mapaCursos[cursoId] = {
          indice: indexCurso++,
          color: coloresPasteles[(indexCurso - 2) % coloresPasteles.length].replace('FF', ''),
          nombre: asig.componente.oferta.curso.nombre,
          ciclo: asig.componente.oferta.id_ciclo, teo: 0, lab: 0, grupos: 0, total: 0
        };
      }
      if (asig.componente.tipo === 'TEORIA') mapaCursos[cursoId].teo += asig.horas_asignadas;
      else mapaCursos[cursoId].lab += asig.horas_asignadas;
      mapaCursos[cursoId].grupos += asig.componente.grupos.length;
      mapaCursos[cursoId].total += asig.horas_asignadas;
    }

    let currentRow = 2;
    for (const cid in mapaCursos) {
      const info = mapaCursos[cid];
      const data = [info.indice, info.nombre, `${info.ciclo}°`, info.teo, info.lab, info.grupos, info.total, 'SISTEMAS'];
      data.forEach((val, i) => {
        const cell = ws.getCell(currentRow, detailCols[i]);
        cell.value = val;
        cell.font = { size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + info.color } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;
    }

    // 3. HORARIO
    const startRowHorario = Math.max(currentRow + 2, 12);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const gridCols = [{ s: 1, e: 2, l: 'HORA' }, { s: 3, e: 4, l: 'LUNES' }, { s: 5, e: 6, l: 'MARTES' }, { s: 7, e: 8, l: 'MIÉRCOLES' }, { s: 9, e: 10, l: 'JUEVES' }, { s: 11, e: 12, l: 'VIERNES' }];

    gridCols.forEach(col => {
      ws.mergeCells(startRowHorario, col.s, startRowHorario, col.e);
      const cell = ws.getCell(startRowHorario, col.s);
      cell.value = col.l;
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
    });

    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, id_docente: idDocente },
      include: { componente: { include: { oferta: true } }, ambiente: true }
    });

    horas.forEach((h, i) => {
      const row = startRowHorario + 1 + i;
      ws.mergeCells(row, 1, row, 2);
      ws.getCell(row, 1).value = h;
      ws.getCell(row, 1).font = { bold: true, size: 8 };
      ws.getRow(row).height = 25;

      dias.forEach((d, di) => {
        const cs = gridCols[di + 1].s, ce = gridCols[di + 1].e;
        ws.mergeCells(row, cs, row, ce);
        const cell = ws.getCell(row, cs);
        const b = bloques.find(bl => bl.dia_semana === d && bl.hora_inicio === h);
        if (b) {
          const info = mapaCursos[b.componente.id_oferta];
          cell.value = `${info?.indice || '?'}\n(${b.ambiente?.codigo || 'Solic.'})`;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (info?.color || 'FFFFFF') } };
          cell.font = { bold: true, size: 8 };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
  }

  static async generarAuditoriaDiaExcel(idPeriodo: number, dia: string): Promise<Buffer> {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`Auditoria ${dia}`);

    ws.columns = [
      { header: 'HORARIO', key: 'hora', width: 15 },
      { header: 'DOCENTE', key: 'docente', width: 30 },
      { header: 'ASIGNATURA', key: 'curso', width: 35 },
      { header: 'CICLO', key: 'ciclo', width: 10 },
      { header: 'TIPO', key: 'tipo', width: 15 },
      { header: 'AMBIENTE', key: 'ambiente', width: 15 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

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

    bloquesAgrupados.forEach(b => {
      ws.addRow({
        hora: `${b.hora_inicio} - ${b.hora_fin}`,
        docente: `${b.docente.apellidos}, ${b.docente.nombres}`,
        curso: b.componente.oferta.curso.nombre,
        ciclo: `${b.componente.oferta.id_ciclo}°`,
        tipo: b.componente.tipo,
        ambiente: b.ambiente?.codigo || 'Por asignar'
      });
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
