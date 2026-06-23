import { apiClient } from '@/lib/api-client';

export const reportesService = {
  // Download PDF report for a single teacher
  pdfDocente: (idDocente: number, idPeriodo: number, exportOption: 'completo' | 'carga-lectiva' | 'carga-no-lectiva' = 'completo') =>
    apiClient.get(`/reportes/docente/${idDocente}/pdf`, {
      params: { idPeriodo, exportOption },
      responseType: 'blob',
    }),

  // Download Excel report for a single teacher
  excelDocente: (idDocente: number, idPeriodo: number, exportOption: 'completo' | 'carga-lectiva' | 'carga-no-lectiva' = 'completo') =>
    apiClient.get(`/reportes/docente/${idDocente}/excel`, {
      params: { idPeriodo, exportOption },
      responseType: 'blob',
    }),

  // Download Excel report for a specific cycle
  excelCiclo: (idCiclo: number, idPeriodo: number) =>
    apiClient.get(`/reportes/ciclo/${idCiclo}/excel`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download PDF report for a specific day (auditoria)
  pdfDia: (dia: string, idPeriodo: number) =>
    apiClient.get(`/reportes/dia/${dia}/pdf`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download Excel report for a specific day (auditoria)
  excelDia: (dia: string, idPeriodo: number) =>
    apiClient.get(`/reportes/dia/${dia}/excel`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download PDF report for a specific cycle
  pdfCiclo: (idCiclo: number, idPeriodo: number) =>
    apiClient.get(`/reportes/ciclo/${idCiclo}/pdf`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download PDF report for a specific ambiente
  pdfAmbiente: (idAmbiente: number, idPeriodo: number) =>
    apiClient.get(`/reportes/ambiente/${idAmbiente}/pdf`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download Excel report for a specific ambiente
  excelAmbiente: (idAmbiente: number, idPeriodo: number) =>
    apiClient.get(`/reportes/ambiente/${idAmbiente}/excel`, {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download Excel report for all cycles
  excelTodosLosCiclos: (idPeriodo: number) =>
    apiClient.get('/reportes/todos-los-ciclos/excel', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download PDF report for all cycles
  pdfTodosLosCiclos: (idPeriodo: number) =>
    apiClient.get('/reportes/todos-los-ciclos/pdf', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download Excel report for all ambientes
  excelTodosLosAmbientes: (idPeriodo: number) =>
    apiClient.get('/reportes/todos-los-ambientes/excel', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download PDF report for all ambientes
  pdfTodosLosAmbientes: (idPeriodo: number) =>
    apiClient.get('/reportes/todos-los-ambientes/pdf', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download global PDF for all teachers
  pdfGlobal: (idPeriodo: number) =>
    apiClient.get('/reportes/global/pdf', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Download global Excel for all teachers
  excelGlobal: (idPeriodo: number) =>
    apiClient.get('/reportes/global/excel', {
      params: { idPeriodo },
      responseType: 'blob',
    }),

  // Send report by email to a single teacher
  enviarCorreoDocente: (idDocente: number, idPeriodo: number) =>
    apiClient.post(`/reportes/enviar-correo/docente/${idDocente}`, { idPeriodo }),

  // Send reports by email to all teachers in a period
  enviarCorreosTodos: (idPeriodo: number) =>
    apiClient.post('/reportes/enviar-correo/todos', { idPeriodo }),

  // Legacy queue-based endpoints
  generar: (datos: any) =>
    apiClient.post('/reportes/generar', datos),

  estado: (jobId: string) =>
    apiClient.get(`/reportes/estado/${jobId}`),

  descargar: (jobId: string) =>
    apiClient.get(`/reportes/descargar/${jobId}`, {
      responseType: 'blob',
    }),
};

// Helper to trigger a file download from a Blob response
export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}