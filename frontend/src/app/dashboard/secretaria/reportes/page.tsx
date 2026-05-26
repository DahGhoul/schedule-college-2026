'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { estadisticasService } from '@/services/estadisticas.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { cn } from '@/lib/utilidades';
import { SelectorFiltrable } from '@/components/ui/SelectorFiltrable';
import { 
  FileText, 
  FileSpreadsheet, 
  Mail, 
  MessageCircle, 
  Download, 
  Calendar, 
  User, 
  BarChart3,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';

export default function ReportesSecretariaPage() {
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idDocente, setIdDocente] = useState<number>(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>('');
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [modalEnviarTodos, setModalEnviarTodos] = useState(false);
  const [descargando, setDescargando] = useState<string | null>(null);

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos-reportes'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo-reportes'],
    queryFn: () => periodosService.activo().then(res => res.data),
  });

  // Seleccionar periodo activo por defecto
  useEffect(() => {
    if (!idPeriodo) {
      if (periodoActivo?.id) {
        setIdPeriodo(periodoActivo.id);
      } else if (periodos && periodos.length > 0) {
        // Si no hay activo, seleccionar el primero de la lista (el más reciente por el order desc)
        setIdPeriodo(periodos[0].id);
      }
    }
  }, [periodoActivo, idPeriodo, periodos]);

  const { data: cargaDocentes, isLoading: cargaLoading } = useQuery({
    queryKey: ['carga-docente-reportes', idPeriodo],
    queryFn: () => estadisticasService.cargaDocente(idPeriodo!).then((res) => res.data),
    enabled: !!idPeriodo,
  });

  const handleDescargar = async (tipo: 'pdf' | 'excel', idDoc?: number) => {
    if (!idPeriodo) return;
    const key = idDoc ? `${tipo}-${idDoc}` : `global-${tipo}`;
    setDescargando(key);
    try {
      let response: any;
      if (idDoc) {
        response = tipo === 'pdf'
          ? await reportesService.pdfDocente(idDoc, idPeriodo)
          : await reportesService.excelDocente(idDoc, idPeriodo);
        const docente = (cargaDocentes || []).find((d: any) => d.id === idDoc);
        const nombre = docente ? `${docente.apellidos}_${docente.nombres}` : `docente_${idDoc}`;
        descargarBlob(response.data, `horario_${nombre}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`);
      } else {
        response = tipo === 'pdf'
          ? await reportesService.pdfGlobal(idPeriodo)
          : await reportesService.excelGlobal(idPeriodo);
        descargarBlob(response.data, `horarios_global.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`);
      }
      setToast({ mensaje: 'Reporte descargado correctamente', tipo: 'exito' });
    } catch (err: any) {
      setToast({ mensaje: err.response?.data?.error || 'Error al generar reporte', tipo: 'error' });
    } finally {
      setDescargando(null);
    }
  };

  const handleDescargarDia = async (tipo: 'pdf' | 'excel') => {
    if (!idPeriodo || !diaSeleccionado) return;
    const key = `dia-${tipo}`;
    setDescargando(key);
    try {
      const response = tipo === 'pdf'
        ? await reportesService.pdfDia(diaSeleccionado, idPeriodo)
        : await reportesService.excelDia(diaSeleccionado, idPeriodo);
      descargarBlob(response.data, `auditoria_${diaSeleccionado.toLowerCase()}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`);
      setToast({ mensaje: 'Reporte de auditoría generado', tipo: 'exito' });
    } catch (err: any) {
      setToast({ mensaje: 'Error al generar reporte de auditoría', tipo: 'error' });
    } finally {
      setDescargando(null);
    }
  };

  const handleEnviarCorreo = async (idDoc: number) => {
    if (!idPeriodo) return;
    setEnviandoId(idDoc);
    try {
      await reportesService.enviarCorreoDocente(idDoc, idPeriodo);
      setToast({ mensaje: 'Reporte enviado al correo del docente', tipo: 'exito' });
    } catch (err: any) {
      setToast({ mensaje: err.response?.data?.error || 'Error al enviar correo', tipo: 'error' });
    } finally {
      setEnviandoId(null);
    }
  };

  const handleEnviarWhatsApp = (docente: any) => {
    if (!docente.telefono) {
      setToast({ mensaje: `El docente ${docente.apellidos} no tiene un teléfono registrado`, tipo: 'error' });
      return;
    }
    let numero = docente.telefono.replace(/\D/g, '');
    if (numero.length === 9) numero = `51${numero}`;

    const urlReporte = `${window.location.origin}/api/reportes/docente/${docente.id}/pdf`;
    const mensaje = `Estimado/a Prof. *${docente.nombres} ${docente.apellidos}*,\n\nLe saluda la Secretaría de la EIS-UNT. Adjuntamos su horario oficial para el periodo actual.\n👉 ${urlReporte}`;

    const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(link, '_blank');
  };

  const enviarTodosMutation = useMutation({
    mutationFn: () => reportesService.enviarCorreosTodos(idPeriodo!),
    onSuccess: (res: any) => {
      const { enviados, errores } = res.data;
      setToast({ mensaje: `Enviados: ${enviados} correos. Errores: ${errores}`, tipo: errores > 0 ? 'error' : 'exito' });
      setModalEnviarTodos(false);
    },
    onError: (err: any) => {
      setToast({ mensaje: err.response?.data?.error || 'Error al enviar correos', tipo: 'error' });
      setModalEnviarTodos(false);
    },
  });

  const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <BarChart3 className="w-3.5 h-3.5" />
              Centro de Reportes y Auditoría
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Reportes Institucionales</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Genera reportes profesionales para docentes, auditorías diarias o consolidados globales en formatos Excel y PDF.
            </p>
          </div>
          
          <div className="w-full lg:w-80 bg-white/10 backdrop-blur-xl p-4 rounded-[2rem] border border-white/20 shadow-inner">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 ml-1 text-center">Seleccionar Periodo Académico</p>
            <Selector
              label=""
              opciones={[
                { valor: '', etiqueta: 'Elegir Periodo...' },
                ...(periodos || []).map((p: any) => ({ valor: String(p.id), etiqueta: p.nombre })),
              ]}
              value={idPeriodo?.toString() || ''}
              onChange={(e) => setIdPeriodo(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-white border-none rounded-2xl text-slate-900 font-bold py-3"
            />
          </div>
        </div>
      </div>

      {!idPeriodo ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in duration-700">
          <div className="p-8 bg-slate-100/50 rounded-full mb-6 ring-8 ring-slate-50">
            <LayoutDashboard className="w-16 h-12 text-slate-300" />
          </div>
          <h4 className="text-xl font-bold text-slate-800">Módulo de Reportes</h4>
          <p className="text-slate-400 font-medium mt-2 text-center max-w-sm">
            Por favor, seleccione un periodo académico para habilitar las herramientas de exportación y auditoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-700">
          
          {/* SECCIÓN 1: REPORTES POR DOCENTE */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reporte por Docente</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Horarios Individuales</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-8 overflow-visible">
                  <SelectorFiltrable
                    label="Buscar Docente"
                    value={idDocente}
                    onChange={(val) => setIdDocente(Number(val))}
                    opciones={(cargaDocentes || []).map((d: any) => ({
                      valor: d.id,
                      etiqueta: `${d.apellidos}, ${d.nombres}`
                    }))}
                    placeholder="Escriba el apellido del docente..."
                  />
                </div>
                <div className="sm:col-span-4 flex gap-2">
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm"
                    disabled={!idDocente || !!descargando}
                    onClick={() => handleDescargar('pdf', idDocente)}
                  >
                    {descargando === `pdf-${idDocente}` ? <SpinnerCarga /> : <FileText className="w-5 h-5" />}
                  </Boton>
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    disabled={!idDocente || !!descargando}
                    onClick={() => handleDescargar('excel', idDocente)}
                  >
                    {descargando === `excel-${idDocente}` ? <SpinnerCarga /> : <FileSpreadsheet className="w-5 h-5" />}
                  </Boton>
                </div>
              </div>

              {idDocente > 0 && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <p className="text-sm font-bold text-slate-600 flex-1">Enviar reporte oficial al docente:</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEnviarCorreo(idDocente)}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleEnviarWhatsApp((cargaDocentes || []).find((d:any) => d.id === idDocente))}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: AUDITORÍA POR DÍA */}
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Control de Auditoría por Día</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Seguimiento de Asistencia</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-8">
                  <Selector
                    label="Seleccionar Día de la Semana"
                    opciones={[
                      { valor: '', etiqueta: 'Elegir Día...' },
                      ...dias.map(d => ({ valor: d, etiqueta: d }))
                    ]}
                    value={diaSeleccionado}
                    onChange={(e) => setDiaSeleccionado(e.target.value)}
                    className="w-full py-4 rounded-2xl border-slate-200 bg-slate-50/50"
                  />
                </div>
                <div className="sm:col-span-4 flex gap-2">
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
                    disabled={!diaSeleccionado || !!descargando}
                    onClick={() => handleDescargarDia('pdf')}
                  >
                    {descargando === 'dia-pdf' ? <SpinnerCarga /> : <FileText className="w-5 h-5" />}
                  </Boton>
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    disabled={!diaSeleccionado || !!descargando}
                    onClick={() => handleDescargarDia('excel')}
                  >
                    {descargando === 'dia-excel' ? <SpinnerCarga /> : <FileSpreadsheet className="w-5 h-5" />}
                  </Boton>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                Este reporte detalla: Docente, Asignatura, Aula y Horario para el día seleccionado.
              </p>
            </div>
          </div>

          {/* SECCIÓN 3: REPORTES GLOBALES */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-[#0b1f3a] rounded-[3rem] shadow-2xl p-8 text-white space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Consolidados Globales</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Reportes de Periodo Completo</p>
                </div>
              </div>

              <div className="space-y-4">
                <Boton 
                  className="w-full py-6 rounded-2xl bg-white/10 hover:bg-white/20 border-white/10 text-white font-bold text-lg flex justify-between px-8"
                  onClick={() => handleDescargar('pdf')}
                  disabled={!!descargando}
                >
                  <span className="flex items-center gap-3"><FileText className="w-6 h-6 text-rose-400" /> PDF Global</span>
                  <ArrowRight className="w-5 h-5 opacity-50" />
                </Boton>
                
                <Boton 
                  className="w-full py-6 rounded-2xl bg-white/10 hover:bg-white/20 border-white/10 text-white font-bold text-lg flex justify-between px-8"
                  onClick={() => handleDescargar('excel')}
                  disabled={!!descargando}
                >
                  <span className="flex items-center gap-3"><FileSpreadsheet className="w-6 h-6 text-emerald-400" /> Excel Global</span>
                  <ArrowRight className="w-5 h-5 opacity-50" />
                </Boton>
              </div>

              <div className="pt-6 border-t border-white/10">
                <Boton 
                  variante="borde"
                  className="w-full py-8 rounded-[2rem] border-2 border-dashed border-white/20 text-white hover:bg-white hover:text-[#0b1f3a] transition-all duration-500 font-black text-xl flex flex-col items-center gap-2"
                  onClick={() => setModalEnviarTodos(true)}
                >
                  <Mail className="w-8 h-8 mb-2" />
                  ENVIAR A TODOS LOS DOCENTES
                  <span className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em]">Sincronización masiva</span>
                </Boton>
              </div>
            </div>

            {/* Tarjeta Informativa */}
            <div className="bg-white rounded-[3rem] shadow-lg border border-slate-200/60 p-8 flex items-center gap-4">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">Garantía de Formato</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Todos los reportes cumplen con el formato institucional A4 y codificación por colores/docente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar a todos */}
      {modalEnviarTodos && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-md w-full mx-4 border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-indigo-50/50">
                <Mail className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">¿Confirmar envío masivo?</h2>
              <p className="text-slate-500 font-medium mt-4 leading-relaxed">
                Esta acción enviará automáticamente los horarios personalizados (PDF + Excel) a los correos institucionales de todos los docentes activos.
              </p>
            </div>
            <div className="flex gap-4">
              <Boton 
                variante="secundario" 
                onClick={() => setModalEnviarTodos(false)} 
                className="flex-1 py-4 rounded-2xl font-bold border-slate-200"
              >
                Cancelar
              </Boton>
              <Boton
                onClick={() => enviarTodosMutation.mutate()}
                disabled={enviarTodosMutation.isPending}
                className="flex-1 py-4 rounded-2xl font-black shadow-lg shadow-unt-primary/20"
              >
                {enviarTodosMutation.isPending ? 'Enviando...' : 'Confirmar Envío'}
              </Boton>
            </div>
          </div>
        </div>
      )}

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
