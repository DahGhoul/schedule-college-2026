import puppeteer from 'puppeteer';
import { prisma } from '@/lib/prisma';

export class GeneradorPDFService {
  /**
   * Genera el PDF a partir de los datos y tipo de reporte
   */
  static async generar(tipo: string, parametros: any): Promise<Buffer> {
    const html = await this.construirHTML(tipo, parametros);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: tipo === 'aula' || tipo === 'laboratorio',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }

  /**
   * Construye el HTML según el tipo de reporte
   */
  private static async construirHTML(tipo: string, parametros: any): Promise<string> {
    switch (tipo) {
      case 'aula':
        return this.reporteAula(parametros);
      case 'laboratorio':
        return this.reporteLaboratorio(parametros);
      case 'docente':
        return this.reporteDocente(parametros);
      case 'gestion':
        return this.reporteGestion(parametros);
      default:
        throw new Error('Tipo de reporte no válido');
    }
  }

  private static async reporteAula(params: any): Promise<string> {
    const { idAula, idPeriodo } = params;
    const ambiente = await prisma.ambiente.findUnique({
      where: { id: idAula },
      include: {
        bloques: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: { componente: { include: { oferta: { include: { curso: true } } } }, docente: true, grupo: true },
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
      },
    });
    if (!ambiente) throw new Error('Ambiente no encontrado');

    const filas = ambiente.bloques
      .map(
        (h) => `
      <tr>
        <td>${h.dia_semana}</td>
        <td>${h.hora_inicio} - ${h.hora_fin}</td>
        <td>${h.componente?.oferta?.curso?.nombre || ''}</td>
        <td>${h.docente?.nombres} ${h.docente?.apellidos}</td>
        <td>${h.componente?.tipo || ''}</td>
      </tr>`
      )
      .join('');

    return `
      <html><body>
        <h1>Reporte de Horario - Aula: ${ambiente.codigo}</h1>
        <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;">
          <tr><th>Día</th><th>Hora</th><th>Curso</th><th>Docente</th><th>Tipo</th></tr>
          ${filas}
        </table>
      </body></html>`;
  }

  private static async reporteLaboratorio(params: any): Promise<string> {
    return this.reporteAula(params); // Misma estructura
  }

  private static async reporteDocente(params: any): Promise<string> {
    const { idDocente, idPeriodo } = params;
    const docente = await prisma.docente.findUnique({
      where: { id: idDocente },
      include: {
        bloques: {
          where: {
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: { componente: { include: { oferta: { include: { curso: true } } } }, ambiente: true, grupo: true },
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
      },
    });
    if (!docente) throw new Error('Docente no encontrado');

    const filas = docente.bloques
      .map(
        (h) => `
      <tr>
        <td>${h.dia_semana}</td>
        <td>${h.hora_inicio} - ${h.hora_fin}</td>
        <td>${h.componente?.oferta?.curso?.nombre || ''}</td>
        <td>${h.ambiente?.codigo || ''}</td>
        <td>${h.componente?.tipo || ''}</td>
      </tr>`
      )
      .join('');

    return `
      <html><body>
        <h1>Reporte de Horario - Docente: ${docente.nombres} ${docente.apellidos}</h1>
        <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;">
          <tr><th>Día</th><th>Hora</th><th>Curso</th><th>Ambiente</th><th>Tipo</th></tr>
          ${filas}
        </table>
      </body></html>`;
  }

  private static async reporteGestion(params: any): Promise<string> {
    const { idPeriodo } = params;
    const resumen = await prisma.bloque_horario.groupBy({
      by: ['estado'],
      where: { id_periodo: idPeriodo },
      _count: true,
    });
    const totalDocentes = await prisma.docente.count({ where: { activo: true } });
    const totalAmbientes = await prisma.ambiente.count({ where: { activo: true } });
    const totalCursos = await prisma.curso.count();

    const filasEstado = resumen
      .map((r) => `<tr><td>${r.estado}</td><td>${r._count}</td></tr>`)
      .join('');

    return `
      <html><body>
        <h1>Reporte de Gestión</h1>
        <h2>Resumen General</h2>
        <p>Total Docentes Activos: ${totalDocentes}</p>
        <p>Total Ambientes Activos: ${totalAmbientes}</p>
        <p>Total Cursos: ${totalCursos}</p>
        <h3>Distribución de Horarios por Estado</h3>
        <table border="1" cellpadding="5">
          <tr><th>Estado</th><th>Cantidad</th></tr>
          ${filasEstado}
        </table>
      </body></html>`;
  }
}
