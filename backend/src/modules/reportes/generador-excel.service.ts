import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

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
        fitToHeight: 1,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
      }
    });

    // Configuración de anchos de columna para distribución A4
    worksheet.getColumn(1).width = 12; // Hora
    worksheet.getColumn(2).width = 22; // Lunes
    worksheet.getColumn(3).width = 22; // Martes
    worksheet.getColumn(4).width = 22; // Miércoles
    worksheet.getColumn(5).width = 22; // Jueves
    worksheet.getColumn(6).width = 22; // Viernes
    worksheet.getColumn(7).width = 5;  // Espaciador
    worksheet.getColumn(8).width = 40; // Leyenda / Datos
    
    // 1. Encabezados Institucionales (A la izquierda, encima del horario)
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'UNIVERSIDAD NACIONAL DE TRUJILLO - ESCUELA DE INGENIERÍA DE SISTEMAS';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    const infoCell = worksheet.getCell('A2');
    infoCell.value = `HORARIO ACADÉMICO: ${periodo?.nombre} | CICLO: ${ciclo?.numero} | SECCIÓN: ÚNICA`;
    infoCell.font = { bold: true, size: 11, color: { argb: 'FF64748B' } };
    infoCell.alignment = { horizontal: 'center' };

    // 2. LEYENDA Y DATOS GENERALES (A la derecha del horario para aprovechar el ancho A4 Landscape)
    worksheet.getCell('H1').value = 'DATOS GENERALES Y LEYENDA';
    worksheet.getCell('H1').font = { bold: true, size: 12, underline: true };
    
    worksheet.getCell('H3').value = 'Periodo:';
    worksheet.getCell('I3').value = periodo?.nombre;
    worksheet.getCell('H4').value = 'Ciclo:';
    worksheet.getCell('I4').value = `${ciclo?.numero}° Ciclo`;
    worksheet.getCell('H5').value = 'Fecha Reporte:';
    worksheet.getCell('I5').value = new Date().toLocaleDateString('es-PE');

    const headerLeyenda = ['ID', 'Curso', 'Docente', 'H. Teoría', 'H. Lab'];
    const startRowLeyenda = 7;
    headerLeyenda.forEach((h, i) => {
      const cell = worksheet.getCell(startRowLeyenda, 8 + i);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const ofertas = await prisma.curso_oferta.findMany({
      where: { id_periodo: idPeriodo, id_ciclo: idCiclo },
      include: {
        curso: true,
        componentes: {
          include: {
            asignaciones: { include: { docente: true } }
          }
        }
      }
    });

    const coloresDocentes = [
      'FFF1F5F9', 'FFE2E8F0', 'FFCBD5E1', 'FF94A3B8', 'FF64748B', 
      'FFDBEAFE', 'FFBFDBFE', 'FF93C5FD', 'FF60A5FA', 'FF3B82F6',
      'FFFCE7F3', 'FFFBCFE8', 'FFF9A8D4', 'FFF472B6', 'FFEC4899'
    ];
    
    const mapaDocentes: Record<number, { indice: number; color: string; nombre: string }> = {};
    let indexDocente = 1;
    let rowLeyenda = startRowLeyenda + 1;

    for (const o of ofertas) {
      for (const comp of o.componentes) {
        for (const asig of comp.asignaciones) {
          const docenteId = asig.id_docente;
          if (!mapaDocentes[docenteId]) {
            mapaDocentes[docenteId] = {
              indice: indexDocente++,
              color: coloresDocentes[(indexDocente - 2) % coloresDocentes.length],
              nombre: `${asig.docente.apellidos}, ${asig.docente.nombres.substring(0,1)}.`
            };
          }

          worksheet.getCell(rowLeyenda, 8).value = mapaDocentes[docenteId].indice;
          worksheet.getCell(rowLeyenda, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mapaDocentes[docenteId].color } };
          worksheet.getCell(rowLeyenda, 9).value = o.curso.nombre;
          worksheet.getCell(rowLeyenda, 10).value = mapaDocentes[docenteId].nombre;
          worksheet.getCell(rowLeyenda, 11).value = comp.tipo === 'TEORIA' ? comp.horas_requeridas : 0;
          worksheet.getCell(rowLeyenda, 12).value = comp.tipo === 'LABORATORIO' ? comp.horas_requeridas : 0;
          
          // Bordes leyenda
          for (let i = 0; i < 5; i++) {
            worksheet.getCell(rowLeyenda, 8 + i).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          }
          rowLeyenda++;
        }
      }
    }

    // 3. HORARIO VISUAL (A la izquierda)
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    const startRowHorario = 4;
    const gridHeader = ['Hora', ...dias];
    gridHeader.forEach((h, i) => {
      const cell = worksheet.getCell(startRowHorario, 1 + i);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const bloques = await prisma.bloque_horario.findMany({
      where: { 
        id_periodo: idPeriodo, 
        componente: { oferta: { id_ciclo: idCiclo, id_periodo: idPeriodo } }
      },
      include: {
        componente: { include: { oferta: { include: { curso: true } } } },
        docente: true,
        ambiente: true
      }
    });

    horas.forEach((hora, hIdx) => {
      const currentRow = startRowHorario + 1 + hIdx;
      worksheet.getCell(currentRow, 1).value = hora;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      worksheet.getCell(currentRow, 1).alignment = { horizontal: 'center' };
      worksheet.getRow(currentRow).height = 35;

      dias.forEach((dia, dIdx) => {
        const cell = worksheet.getCell(currentRow, 2 + dIdx);
        const bloque = bloques.find(b => b.dia_semana === dia && b.hora_inicio === hora);
        
        if (bloque) {
          const infoDocente = mapaDocentes[bloque.id_docente];
          cell.value = `${bloque.componente.oferta.curso.nombre}\n${bloque.ambiente?.codigo || 'Solic.'}\n[ID: ${infoDocente?.indice || '?'}]`;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: infoDocente?.color || 'FFFFFFFF' } };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.font = { size: 8 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
  }
}
