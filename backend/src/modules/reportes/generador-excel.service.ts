import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export class GeneradorExcelService {
  static async generarHorarioExcel(idPeriodo: number, idCiclo: number) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Horario Académico');

    const periodo = await prisma.periodo_academico.findUnique({ where: { id: idPeriodo } });
    const ciclo = await prisma.ciclo.findUnique({ where: { id: idCiclo } });
    
    // 1. Encabezados Institucionales
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'UNIVERSIDAD NACIONAL DE TRUJILLO - FACULTAD DE INGENIERÍA - SEDE CENTRAL';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:J2');
    const escuelaCell = worksheet.getCell('A2');
    escuelaCell.value = 'ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS';
    escuelaCell.font = { bold: true, size: 12 };
    escuelaCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:J3');
    const infoCell = worksheet.getCell('A3');
    infoCell.value = `CICLO: ${ciclo?.numero} - AÑO ACADÉMICO: ${periodo?.nombre} - SECCIÓN: ÚNICA`;
    infoCell.alignment = { horizontal: 'center' };

    // 2. Tabla de Detalles de Cursos y Docentes
    worksheet.addRow([]); // Espacio
    const headerRow = worksheet.addRow([
      'Índice', 'Código', 'Curso', 'Docente', 'T', 'P', 'L', 'Grupos', 'Total Horas'
    ]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
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
      'FFFFD1D1', 'FFD1FFD1', 'FFD1D1FF', 'FFFFFFD1', 'FFFFD1FF', 'FFD1FFFF',
      'FFE0E0E0', 'FFF5B7B1', 'FFAED6F1', 'FFD2B4DE', 'FFABEBC6', 'FFF9E79F'
    ];
    
    const mapaDocentes: Record<number, { indice: number; color: string; nombre: string }> = {};
    let indexDocente = 1;

    ofertas.forEach((o) => {
      o.componentes.forEach((comp) => {
        comp.asignaciones.forEach((asig) => {
          if (!mapaDocentes[asig.id_docente]) {
            mapaDocentes[asig.id_docente] = {
              indice: indexDocente++,
              color: coloresDocentes[(indexDocente - 2) % coloresDocentes.length],
              nombre: `${asig.docente.apellidos}, ${asig.docente.nombres}`
            };
          }

          const row = worksheet.addRow([
            mapaDocentes[asig.id_docente].indice,
            o.curso.codigo,
            o.curso.nombre,
            mapaDocentes[asig.id_docente].nombre,
            comp.tipo === 'TEORIA' ? asig.horas_asignadas : 0,
            comp.tipo === 'PRACTICA' ? asig.horas_asignadas : 0,
            comp.tipo === 'LABORATORIO' ? asig.horas_asignadas : 0,
            1, // Simplificado
            asig.horas_asignadas
          ]);

          row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mapaDocentes[asig.id_docente].color } };
        });
      });
    });

    // 3. Generar Horario Visual
    worksheet.addRow([]);
    worksheet.addRow(['HORARIO VISUAL']).font = { bold: true };

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
    ];

    const gridHeader = worksheet.addRow(['Hora', ...dias]);
    gridHeader.font = { bold: true };

    const bloques = await prisma.bloque_horario.findMany({
      where: { id_periodo: idPeriodo, id_grupo: { in: (await prisma.grupo.findMany({ where: { componente: { oferta: { id_periodo: idPeriodo, id_ciclo: idCiclo } } } })).map(g => g.id) } },
      include: {
        componente: { include: { oferta: { include: { curso: true } } } },
        docente: true,
        ambiente: true
      }
    });

    for (const hora of horas) {
      const rowData = [hora];
      for (const dia of dias) {
        const bloque = bloques.find(b => b.dia_semana === dia && b.hora_inicio === hora);
        if (bloque) {
          const infoDocente = mapaDocentes[bloque.id_docente];
          rowData.push(`${bloque.componente.oferta.curso.nombre}\n(${bloque.ambiente?.codigo || 'Solic.'})\nProf: ${infoDocente?.indice || '?'}`);
        } else {
          rowData.push('');
        }
      }
      const row = worksheet.addRow(rowData);
      row.height = 40;
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      // Aplicar colores
      for (let i = 0; i < dias.length; i++) {
        const dia = dias[i];
        const bloque = bloques.find(b => b.dia_semana === dia && b.hora_inicio === hora);
        if (bloque && mapaDocentes[bloque.id_docente]) {
          row.getCell(i + 2).fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: mapaDocentes[bloque.id_docente].color } 
          };
          row.getCell(i + 2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
      }
    }

    worksheet.getColumn(1).width = 15;
    for (let i = 2; i <= 7; i++) worksheet.getColumn(i).width = 25;

    return workbook.xlsx.writeBuffer();
  }
}
