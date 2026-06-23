"use client";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { cargaNoLectivaService } from '@/services/carga-no-lectiva.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { FileText, Clock, ArrowLeft } from 'lucide-react';
import { CalendarioGeneralConNoLectivos } from '@/components/horarios/CalendarioGeneralConNoLectivos';

export default function VistaHorarioDocentePage() {
  const router = useRouter();
  const { usuario } = useAuthStore();
  const docenteIdFromSession = usuario?.idDocente || null;
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(docenteIdFromSession);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [exportOption, setExportOption] = useState<'completo' | 'carga-lectiva' | 'carga-no-lectiva'>('completo');
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  const { data: periodosData, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos-vista-docente'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });
  const periodos = Array.isArray(periodosData) ? periodosData : periodosData?.data || [];

  const { data: periodoActivo, isLoading: periodoActivoLoading } = useQuery({
    queryKey: ['periodo-activo-vista-docente'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const [idPeriodoSeleccionado, setIdPeriodoSeleccionado] = useState<number>(0);
  useEffect(() => {
    if (periodoActivo && idPeriodoSeleccionado === 0) {
      setIdPeriodoSeleccionado(periodoActivo.id);
    }
  }, [periodoActivo]);
  const idPeriodo = idPeriodoSeleccionado || periodoActivo?.id || 0;

  const handleExportarPdf = async () => {
    if (!idPeriodo || !docenteSeleccionado || exportandoPdf) return;

    setExportandoPdf(true);
    try {
      const response = await reportesService.pdfDocente(docenteSeleccionado, idPeriodo, exportOption);
      const nombreDocente = usuario?.docente
        ? `${usuario.docente.apellidos || ''}_${usuario.docente.nombres || ''}`.replace(/\s+/g, '_')
        : 'horario';
      descargarBlob(response.data, `horario_${nombreDocente}.pdf`);
      setToast({ mensaje: 'PDF generado correctamente', tipo: 'exito' });
    } catch (err) {
      setToast({ mensaje: 'Error al generar el PDF', tipo: 'error' });
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarExcel = async () => {
    if (!idPeriodo || !docenteSeleccionado || exportandoExcel) return;

    setExportandoExcel(true);
    try {
      const response = await reportesService.excelDocente(docenteSeleccionado, idPeriodo, exportOption);
      const nombreDocente = usuario?.docente
        ? `${usuario.docente.apellidos || ''}_${usuario.docente.nombres || ''}`.replace(/\s+/g, '_')
        : 'horario';
      descargarBlob(response.data, `horario_${nombreDocente}.xlsx`);
      setToast({ mensaje: 'Excel generado correctamente', tipo: 'exito' });
    } catch (err) {
      setToast({ mensaje: 'Error al generar el Excel', tipo: 'error' });
    } finally {
      setExportandoExcel(false);
    }
  };

  if (periodoActivoLoading || periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white shadow-xl relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/docente')} className="rounded-full p-3 text-white hover:bg-white/20 transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                Panel Docente
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Mi Horario Completo
              </h1>
              <p className="text-sm text-blue-100">
                Visualiza tu horario lectivo y no lectivo para el período académico
              </p>
            </div>
          </div>

          <div className="w-full lg:w-64 space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Periodo Académico</label>
            <Selector
              value={idPeriodoSeleccionado}
              onChange={(e: any) => setIdPeriodoSeleccionado(Number(e.target.value))}
              className="border-white/20 bg-white/95 text-slate-900 focus:border-white focus:ring-white/30 shadow-sm"
            >
              {periodos.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Selector>
          </div>
        </div>
      </header>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {!usuario?.idDocente ? (
        <div className="text-gray-500 text-center py-16 bg-white rounded-[1.5rem] shadow-sm border border-gray-100">
          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          Este módulo solo está disponible para docentes autenticados.
        </div>
      ) : docenteSeleccionado && idPeriodo ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tipo de exportación</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportOption"
                    value="completo"
                    checked={exportOption === 'completo'}
                    onChange={(e) => setExportOption(e.target.value as any)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">Horario completo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportOption"
                    value="carga-lectiva"
                    checked={exportOption === 'carga-lectiva'}
                    onChange={(e) => setExportOption(e.target.value as any)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">Carga lectiva</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportOption"
                    value="carga-no-lectiva"
                    checked={exportOption === 'carga-no-lectiva'}
                    onChange={(e) => setExportOption(e.target.value as any)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">Carga no lectiva</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Boton
                onClick={handleExportarExcel}
                disabled={exportandoExcel}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-[1.5rem]"
              >
                <Clock className="h-4 w-4" />
                {exportandoExcel ? 'Generando Excel...' : 'Exportar Excel'}
              </Boton>
              <Boton
                onClick={handleExportarPdf}
                disabled={exportandoPdf}
                className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold rounded-[1.5rem]"
              >
                <FileText className="h-4 w-4" />
                {exportandoPdf ? 'Generando PDF...' : 'Exportar PDF'}
              </Boton>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <CalendarioGeneralConNoLectivos idPeriodo={idPeriodo} idDocente={docenteSeleccionado} />
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-16 bg-white rounded-[1.5rem] shadow-sm border border-gray-100">
          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          No se pudo identificar el docente o el período académico.
        </div>
      )}
    </div>
  );
}
