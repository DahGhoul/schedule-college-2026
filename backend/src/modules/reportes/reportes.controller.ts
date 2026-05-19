import { Request, Response } from 'express';
import { ReportesService } from './reportes.service';
import { GeneradorExcelService } from './generador-excel.service';
import path from 'path';

export class ReportesController {
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