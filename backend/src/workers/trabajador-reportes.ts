import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import { GeneradorPDFService } from '@/modules/reportes/generador-pdf.service';
import fs from 'fs';
import path from 'path';

const CARPETA_REPORTES = path.join(process.cwd(), 'reportes');

const worker = new Worker(
  'reportes',
  async (job) => {
    const { tipo, parametros } = job.data;
    console.log(`Generando reporte ${tipo} (job ${job.id})`);

    // Actualizar progreso
    await job.updateProgress(10);

    // Generar PDF
    const pdfBuffer = await GeneradorPDFService.generar(tipo, parametros);

    await job.updateProgress(90);

    // Guardar en disco
    const filePath = path.join(CARPETA_REPORTES, `${job.id}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    await job.updateProgress(100);
    return { filePath };
  },
  { connection: redis }
);

export default worker;