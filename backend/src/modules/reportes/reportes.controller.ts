import { Request, Response } from 'express';
import { ReportesService } from './reportes.service';
import { EmailService } from './email.service';
import { GeneradorExcelService } from './generador-excel.service';

export class ReportesController {
  // ---- PDF: single teacher ----
  static async pdfDocente(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.idDocente);
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idDocente) || isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idDocente e idPeriodo son requeridos' });
      }
      const buffer = await ReportesService.generarPDFDocente(idDocente, idPeriodo);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="horario-docente-${idDocente}.pdf"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Excel: single teacher ----
  static async excelDocente(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.idDocente);
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idDocente) || isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idDocente e idPeriodo son requeridos' });
      }
      const buffer = await ReportesService.generarExcelDocente(idDocente, idPeriodo);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="horario-docente-${idDocente}.xlsx"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- PDF: global (all teachers) ----
  static async pdfGlobal(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idPeriodo es requerido' });
      }
      const buffer = await ReportesService.generarPDFGlobal(idPeriodo);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="horario-global.pdf"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Excel: global (all teachers) ----
  static async excelGlobal(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idPeriodo es requerido' });
      }
      const buffer = await ReportesService.generarExcelGlobal(idPeriodo);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="horario-global.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Excel: per cycle ----
  static async excelCiclo(req: Request, res: Response) {
    try {
      const idCiclo = parseInt(req.params.idCiclo);
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idCiclo) || isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idCiclo e idPeriodo son requeridos' });
      }
      const buffer = await GeneradorExcelService.generarHorarioExcel(idPeriodo, idCiclo);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="horario-ciclo-${idCiclo}.xlsx"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Excel: all cycles ----
  static async excelTodosLosCiclos(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idPeriodo es requerido' });
      }
      const buffer = await GeneradorExcelService.generarTodosLosCiclosExcel(idPeriodo);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="horarios-todos-los-ciclos.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Email: single teacher ----
  static async enviarCorreoDocente(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.idDocente);
      const idPeriodo = parseInt(req.body.idPeriodo ?? req.query.idPeriodo as string);
      if (isNaN(idDocente) || isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idDocente e idPeriodo son requeridos' });
      }
      await EmailService.enviarReporteDocente(idDocente, idPeriodo);
      res.json({ mensaje: 'Correo enviado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Email: all teachers ----
  static async enviarCorreosTodos(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.body.idPeriodo ?? req.query.idPeriodo as string);
      if (isNaN(idPeriodo)) {
        return res.status(400).json({ error: 'idPeriodo es requerido' });
      }
      const resultado = await EmailService.enviarReportesTodosDocentes(idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---- Legacy endpoints (keep backward compat) ----
  static async descargarExcel(req: Request, res: Response) {
    try {
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      const idCiclo = parseInt(req.query.idCiclo as string);
      if (isNaN(idPeriodo) || isNaN(idCiclo)) {
        return res.status(400).json({ error: 'idPeriodo e idCiclo son requeridos' });
      }
      const buffer = await GeneradorExcelService.generarHorarioExcel(idPeriodo, idCiclo);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=horario-${idPeriodo}-${idCiclo}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async generar(req: Request, res: Response) {
    try {
      const { tipo, ...parametros } = req.body;
      if (!tipo) return res.status(400).json({ error: 'Tipo de reporte requerido' });
      const resultado = await ReportesService.solicitarGeneracion(tipo, parametros);
      res.status(202).json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async estadoDescarga(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const estado = await ReportesService.obtenerEstado(jobId);
      res.json(estado);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async descargar(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const pdfPath = ReportesService.obtenerPDF(jobId);
      if (!pdfPath) return res.status(404).json({ error: 'PDF no encontrado' });
      res.download(pdfPath, `reporte-${jobId}.pdf`);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}