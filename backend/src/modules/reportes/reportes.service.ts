import { colaReportes } from '@/cola/cola-reportes';
import { redis } from '@/lib/redis';
import fs from 'fs';
import path from 'path';

const CARPETA_REPORTES = path.join(process.cwd(), 'reportes');

// Asegurar que la carpeta exista
if (!fs.existsSync(CARPETA_REPORTES)) {
  fs.mkdirSync(CARPETA_REPORTES, { recursive: true });
}

export class ReportesService {
  /**
   * Encola un trabajo de generación de reporte
   */
  static async solicitarGeneracion(tipo: string, parametros: any) {
    const trabajo = await colaReportes.add('generar-reporte', { tipo, parametros });
    return { jobId: trabajo.id };
  }

  /**
   * Obtiene el estado de un trabajo y la ruta del PDF si está completado
   */
  static async obtenerEstado(jobId: string) {
    const trabajo = await colaReportes.getJob(jobId);
    if (!trabajo) throw new Error('Trabajo no encontrado');

    const estado = await trabajo.getState();
    const resultado = {
      estado,
      progreso: trabajo.progress,
    };

    if (estado === 'completed') {
      const pdfPath = path.join(CARPETA_REPORTES, `${jobId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        return { ...resultado, descargable: true, ruta: `/api/reportes/descargar/${jobId}` };
      }
    }

    return resultado;
  }

  /**
   * Devuelve el archivo PDF generado
   */
  static obtenerPDF(jobId: string): string | null {
    const pdfPath = path.join(CARPETA_REPORTES, `${jobId}.pdf`);
    if (fs.existsSync(pdfPath)) return pdfPath;
    return null;
  }
}