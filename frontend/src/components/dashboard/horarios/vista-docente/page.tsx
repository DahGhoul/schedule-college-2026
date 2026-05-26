"use client";
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Selector } from '@/components/ui/Selector';
import { docentesService } from '@/services/docentes.service';
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { Download } from 'lucide-react';

export default function VistaHorarioDocentePage() {
  const { usuario } = useAuthStore();
  const docenteIdFromSession = usuario?.idDocente || null;
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(docenteIdFromSession);
  const [mensaje] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const horarioRef = useRef<HTMLDivElement | null>(null);

  const { data: periodoActivo, isLoading } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  const handleExportarPdf = async () => {
    if (!horarioRef.current || exportandoPdf) return;

    setExportandoPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(horarioRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const marginX = 10;
      const marginY = 10;
      const pageWidth = pdf.internal.pageSize.getWidth() - marginX * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - marginY * 2;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let remainingHeight = imgHeight;
      let positionY = marginY;

      pdf.addImage(imgData, 'PNG', marginX, positionY, pageWidth, imgHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        positionY = remainingHeight - imgHeight + marginY;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, positionY, pageWidth, imgHeight);
        remainingHeight -= pageHeight;
      }

      const nombreDocente = usuario?.docente
        ? `${usuario.docente.apellidos || ''}_${usuario.docente.nombres || ''}`.replace(/\s+/g, '_')
        : 'horario';
      pdf.save(`horario_${nombreDocente}.pdf`);
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Horario por Docente</h1>
      {mensaje && <NotificacionToast mensaje={mensaje.mensaje} tipo={mensaje.tipo} />}

      {/* Mostrar selector solo si el usuario no es un docente */}
      {!docenteIdFromSession && (
        <div className="mb-4">
          <Selector
            label="Seleccionar Docente"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar...' },
              ...(docentes?.map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })) || []),
            ]}
            value={docenteSeleccionado?.toString() || ''}
            onChange={(e) => setDocenteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
      )}

      {isLoading ? (
        <SpinnerCarga />
      ) : docenteSeleccionado && periodoActivo ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Boton
              onClick={handleExportarPdf}
              disabled={exportandoPdf}
              className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold"
            >
              <Download className="h-4 w-4" />
              {exportandoPdf ? 'Generando PDF...' : 'Exportar como PDF'}
            </Boton>
          </div>
          <div ref={horarioRef} className="bg-white rounded-xl">
            <CalendarioGeneral idPeriodo={periodoActivo.id} filtroTipo="DOCENTE" filtroId={docenteSeleccionado} modo="LECTURA" />
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          No se pudo identificar el docente de la sesión.
        </p>
      )}
    </div>
  );
}
