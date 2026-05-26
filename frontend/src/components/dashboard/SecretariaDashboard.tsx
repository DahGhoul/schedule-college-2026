'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { useKPIsSecretaria } from '@/hooks/useEstadisticas';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/auth.store';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { 
  Users, 
  BookOpen, 
  School, 
  Clock, 
  CheckSquare, 
  FileDown, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Mail,
  LayoutDashboard,
  Calendar,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MessageCircle,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { cn } from '@/lib/utilidades';

export default function SecretariaDashboard() {
  const { usuario } = useAuthStore();
  
  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos-lista-secretaria'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo-secretaria'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const [idPeriodo, setIdPeriodo] = useState<number>(0);

  // Seleccionar periodo activo por defecto
  useEffect(() => {
    if (periodoActivo && idPeriodo === 0) {
      setIdPeriodo(periodoActivo.id);
    } else if (!idPeriodo && periodos && periodos.length > 0) {
      setIdPeriodo(periodos[0].id);
    }
  }, [periodoActivo, periodos, idPeriodo]);

  const { data: kpisData, isLoading: kpisLoading } = useKPIsSecretaria(idPeriodo);
  const [modalPublicarOpen, setModalPublicarOpen] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [descargando, setDescargando] = useState<'pdf' | 'excel' | null>(null);

  const handleDescargarGlobal = async (tipo: 'pdf' | 'excel') => {
    if (!idPeriodo) return;
    setDescargando(tipo);
    try {
      const response = tipo === 'pdf'
        ? await reportesService.pdfGlobal(idPeriodo)
        : await reportesService.excelGlobal(idPeriodo);
      descargarBlob(response.data, `horarios_global_${tipo === 'pdf' ? 'pdf' : 'xlsx'}`);
      setToast({ mensaje: 'Reporte global descargado con éxito', tipo: 'exito' });
    } catch (err: any) {
      setToast({ mensaje: 'Error al generar reporte global', tipo: 'error' });
    } finally {
      setDescargando(null);
    }
  };

  const enviarCorreosTodosMutation = useMutation({
    mutationFn: () => reportesService.enviarCorreosTodos(idPeriodo),
    onSuccess: (res: any) => {
      const { enviados, errores } = res.data;
      setToast({
        mensaje: errores > 0 
          ? `Publicación con advertencias. Se enviaron ${enviados} correos, pero hubo ${errores} errores.`
          : `Publicación exitosa. Se enviaron ${enviados} correos.`,
        tipo: errores > 0 ? 'error' : 'exito',
      });
      setModalPublicarOpen(false);
    },
    onError: (err: any) => {
      setToast({
        mensaje: err.response?.data?.error || 'Error al publicar e informar',
        tipo: 'error',
      });
      setModalPublicarOpen(false);
    },
  });

  if (periodosLoading || kpisLoading) return <SpinnerCarga />;

  const porcentajeDocentes = kpisData?.docentes.total > 0 
    ? Math.round((kpisData.docentes.elegidos / kpisData.docentes.total) * 100) 
    : 0;
  const porcentajeCursos = kpisData?.cursos.total > 0 
    ? Math.round((kpisData.cursos.completos / kpisData.cursos.total) * 100) 
    : 0;
  const porcentajeOcupacion = kpisData?.ocupacion.horasDisponibles > 0 
    ? Math.round((kpisData.ocupacion.horasOcupadas / kpisData.ocupacion.horasDisponibles) * 100) 
    : 0;

  const chartData = (kpisData?.avanceCursos || [])
    .map((curso: any) => ({
      curso: curso.curso,
      porcentaje: curso.porcentaje
    }))
    .sort((a: any, b: any) => b.porcentaje - a.porcentaje)
    .slice(0, 10); // Mostrar top 10 o los que tengan menos avance

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Panel de Control Administrativo
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Bienvenido, {usuario?.nombres?.split(' ')[0] || 'Administrador'}</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Monitorea el avance de la programación académica, gestiona ambientes y publica horarios oficiales para toda la Escuela.
            </p>
          </div>
          
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-inner">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 ml-1">Periodo de Gestión Actual</p>
            <Selector
              label=""
              opciones={[
                { valor: '', etiqueta: 'Seleccionar Periodo...' },
                ...(periodos || []).map((p: any) => ({ valor: String(p.id), etiqueta: p.nombre })),
              ]}
              value={idPeriodo?.toString() || ''}
              onChange={(e) => setIdPeriodo(e.target.value ? parseInt(e.target.value) : 0)}
              className="w-full bg-white border-none rounded-2xl text-slate-900 font-bold py-3"
            />
          </div>
        </div>
      </div>

      {/* Grid de KPIs Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-100">
        
        {/* KPI: Docentes */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participación</span>
              <p className="text-2xl font-black text-slate-800">{porcentajeDocentes}%</p>
            </div>
          </div>
          <h3 className="text-slate-500 font-bold text-sm uppercase tracking-tight mb-1">Docentes Activos</h3>
          <p className="text-slate-400 text-xs font-medium mb-4">{kpisData?.docentes.elegidos} de {kpisData?.docentes.total} ya eligieron horario</p>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${porcentajeDocentes}%` }} />
          </div>
        </div>

        {/* KPI: Cursos */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completitud</span>
              <p className="text-2xl font-black text-slate-800">{porcentajeCursos}%</p>
            </div>
          </div>
          <h3 className="text-slate-500 font-bold text-sm uppercase tracking-tight mb-1">Cursos Programados</h3>
          <p className="text-slate-400 text-xs font-medium mb-4">{kpisData?.cursos.completos} de {kpisData?.cursos.total} con carga completa</p>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${porcentajeCursos}%` }} />
          </div>
        </div>

        {/* KPI: Ambientes */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <School className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ocupación</span>
              <p className="text-2xl font-black text-slate-800">{porcentajeOcupacion}%</p>
            </div>
          </div>
          <h3 className="text-slate-500 font-bold text-sm uppercase tracking-tight mb-1">Uso de Ambientes</h3>
          <p className="text-slate-400 text-xs font-medium mb-4">{kpisData?.ocupacion.horasOcupadas}h de {kpisData?.ocupacion.horasDisponibles}h semanales</p>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${porcentajeOcupacion}%` }} />
          </div>
        </div>

        {/* KPI: Ventana / Tiempo */}
        <div className="bg-[#0b1f3a] rounded-[2.5rem] p-8 shadow-2xl text-white group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-white/10 rounded-2xl text-white group-hover:bg-white group-hover:text-[#0b1f3a] transition-all duration-300">
              <Clock className="w-6 h-6" />
            </div>
            {kpisData?.ventana && (
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                kpisData.ventana.semaforo === 'ROJO' ? 'bg-rose-500' : 
                kpisData.ventana.semaforo === 'AMARILLO' ? 'bg-amber-500' : 'bg-emerald-500'
              )}>
                En Curso
              </div>
            )}
          </div>
          <h3 className="text-white/50 font-bold text-sm uppercase tracking-tight mb-1">Tiempo de Ventana</h3>
          {kpisData?.ventana ? (
            <>
              <p className="text-2xl font-black mb-4">
                {kpisData.ventana.tiempoRestante.dias}d {kpisData.ventana.tiempoRestante.horas}h {kpisData.ventana.tiempoRestante.minutos}m
              </p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Restantes para el cierre</p>
            </>
          ) : (
            <p className="text-xl font-bold text-white/40">Sin ventana activa</p>
          )}
        </div>
      </div>

      {/* Accesos Rápidos y Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Lado Izquierdo: Tarjetas de Acción (8/12) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-700 delay-200">
          
          {/* Card: Registro Manual */}
          <Link href="/dashboard/secretaria/registro-horarios" className="group">
            <div className="h-full bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 w-fit">
                  <CheckSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Registro Manual</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Asigna horarios directamente para docentes con dificultades de acceso.</p>
                </div>
                <div className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest gap-2">
                  Ir al Formulario <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card: Ambientes */}
          <Link href="/dashboard/secretaria/ambientes" className="group">
            <div className="h-full bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-50/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 w-fit">
                  <School className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Infraestructura</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Gestiona aulas, laboratorios y verifica disponibilidad física en tiempo real.</p>
                </div>
                <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest gap-2">
                  Ver Ambientes <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card: Reportes Consolidados */}
          <div className="md:col-span-2 bg-white rounded-[3rem] p-6 sm:p-8 shadow-xl border border-slate-100 overflow-hidden relative">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 xl:gap-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                <div className="p-4 sm:p-5 bg-blue-50 rounded-[2rem] text-blue-600 flex-shrink-0">
                  <FileDown className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1 truncate sm:whitespace-normal">Reportes Institucionales</h3>
                  <p className="text-slate-500 text-xs sm:text-sm max-w-md">Descarga consolidados globales de todo el periodo académico.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full xl:w-auto">
                <Boton
                  variante="borde"
                  className="flex-1 xl:flex-none px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold border-slate-200 text-sm sm:text-base whitespace-nowrap"
                  onClick={() => handleDescargarGlobal('pdf')}
                  disabled={!!descargando}
                >
                  {descargando === 'pdf' ? <SpinnerCarga /> : <><FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> PDF Global</>}
                </Boton>
                <Boton
                  variante="borde"
                  className="flex-1 xl:flex-none px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold border-slate-200 text-sm sm:text-base whitespace-nowrap"
                  onClick={() => handleDescargarGlobal('excel')}
                  disabled={!!descargando}
                >
                  {descargando === 'excel' ? <SpinnerCarga /> : <><FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Excel Global</>}
                </Boton>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Publicación y Notificación (4/12) */}
        <div className="lg:col-span-4 animate-in slide-in-from-right-4 duration-700 delay-300">
          <div className="bg-[#0b1f3a] h-full rounded-[3rem] p-10 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div className="p-5 bg-white/10 rounded-[2rem] text-white w-fit">
                <Mail className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight mb-4">Publicación Oficial</h3>
                <p className="text-white/60 leading-relaxed mb-6">
                  Una vez finalizada la carga horaria, notifica automáticamente a todos los docentes con sus horarios adjuntos en formato oficial.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Genera PDF personalizado por docente
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Envío masivo vía correo institucional
                  </div>
                </div>
              </div>
            </div>

            <Boton
              className="relative z-10 w-full py-8 rounded-[2rem] bg-white text-[#0b1f3a] hover:bg-indigo-50 transition-all duration-500 font-black text-xl flex items-center justify-center gap-3 mt-12 shadow-2xl shadow-black/20"
              onClick={() => setModalPublicarOpen(true)}
              disabled={enviarCorreosTodosMutation.isPending}
            >
              {enviarCorreosTodosMutation.isPending ? 'PROCESANDO...' : 'PUBLICAR Y ENVIAR'}
              <ArrowRight className="w-6 h-6" />
            </Boton>
          </div>
        </div>
      </div>

      {/* Sección de Gráficos de Avance */}
      <div className="animate-in slide-in-from-bottom-4 duration-700 delay-400">
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Avance de Programación</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Top 10 Cursos por Periodo</p>
              </div>
            </div>
          </div>

          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  dataKey="curso"
                  type="category"
                  width={250}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px' }}
                  itemStyle={{ fontWeight: 800, fontSize: '14px' }}
                />
                <Bar dataKey="porcentaje" radius={[0, 20, 20, 0]} barSize={32}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.porcentaje === 100 ? '#10b981' : '#6366f1'} />
                  ))}
                  <LabelList 
                    dataKey="porcentaje" 
                    position="right" 
                    formatter={(value: number) => `${value}%`} 
                    style={{ fontWeight: 900, fontSize: '14px', fill: '#1e293b' }} 
                    offset={15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal de Publicación */}
      <Modal
        abierto={modalPublicarOpen}
        cerrar={() => setModalPublicarOpen(false)}
        titulo="¿Confirmar Publicación Oficial?"
      >
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center ring-8 ring-indigo-50/50">
              <Mail className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Notificación Masiva</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Esta acción enviará automáticamente los horarios personalizados (PDF + Excel) a los correos institucionales de todos los docentes activos con carga horaria.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-bold leading-relaxed">
              Asegúrate de que la configuración SMTP esté correcta. El proceso puede tardar unos minutos dependiendo de la cantidad de docentes.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Boton 
              variante="secundario" 
              onClick={() => setModalPublicarOpen(false)} 
              className="flex-1 py-4 rounded-2xl font-bold"
            >
              Cancelar
            </Boton>
            <Boton
              onClick={() => enviarCorreosTodosMutation.mutate()}
              disabled={enviarCorreosTodosMutation.isPending}
              className="flex-1 py-4 rounded-2xl font-black shadow-lg"
            >
              {enviarCorreosTodosMutation.isPending ? 'Enviando...' : 'Confirmar Envío'}
            </Boton>
          </div>
        </div>
      </Modal>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}

