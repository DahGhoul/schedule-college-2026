'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { periodosService } from '@/services/periodos.service';
import { useResumenDocente } from '@/hooks/useEstadisticas';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { cn } from '@/lib/utilidades';
import {
  BookOpen,
  Clock,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  Compass,
} from 'lucide-react';

export default function DashboardDocentePage() {
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [descargando, setDescargando] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    router.prefetch('/dashboard/horarios/seleccion');
    router.prefetch('/dashboard/horarios/vista-docente');
    router.prefetch('/dashboard/notificaciones/preferencias');
    router.prefetch('/dashboard/docente/carga-no-lectiva');
  }, [router]);

  // Si el usuario no es docente, redirigir al dashboard administrativo
  useEffect(() => {
    if (usuario && usuario.rol !== 'DOCENTE') {
      router.replace('/dashboard/admin');
    }
  }, [usuario, router]);

  const nombreDocente = usuario?.docente?.nombres || usuario?.nombre || 'Docente';
  const apellidoDocente = usuario?.docente?.apellidos || '';
  const docenteId = usuario?.idDocente || 0;

  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo-docente-dashboard'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: periodos } = useQuery({
    queryKey: ['periodos-lista-docente-dashboard'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const [idPeriodoSeleccionado, setIdPeriodoSeleccionado] = useState<number>(0);
  const idPeriodo = idPeriodoSeleccionado || periodoActivo?.id || 0;

  const { data: resumen, isLoading: resumenLoading } = useResumenDocente(docenteId, idPeriodo);

  const [descargando, setDescargando] = useState<'pdf' | 'excel' | null>(null);
  const [exportOption, setExportOption] = useState<'completo' | 'carga-lectiva' | 'carga-no-lectiva'>('completo');

  const handleDescargarReporte = async (tipo: 'pdf' | 'excel') => {
    if (!idPeriodo || !docenteId) return;
    setDescargando(tipo);
    try {
      const response = tipo === 'pdf'
        ? await reportesService.pdfDocente(docenteId, idPeriodo, exportOption)
        : await reportesService.excelDocente(docenteId, idPeriodo, exportOption);
      const nombre = `${apellidoDocente.replace(/\s+/g, '_')}_${nombreDocente.replace(/\s+/g, '_')}`;
      descargarBlob(response.data, `horario_${nombre}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`);
      setToast({ mensaje: 'Reporte descargado correctamente', tipo: 'exito' });
    } catch (err: any) {
      setToast({ mensaje: 'Error al generar reporte. Inténtelo de nuevo.', tipo: 'error' });
    } finally {
      setDescargando(null);
    }
  };

  if (periodoLoading || resumenLoading) return <SpinnerCarga />;

  const proximaVentana = resumen?.proximaVentana;
  let bannerElement = null;

  if (proximaVentana) {
    // Obtenemos la fecha y hora actual en Lima usando Intl.DateTimeFormat para máxima robustez
    const getLimaParts = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
      }).formatToParts(date);
      const find = (type: string) => Number(parts.find(p => p.type === type)?.value);
      return { y: find('year'), m: find('month') - 1, d: find('day'), h: find('hour'), min: find('minute') };
    };

    const lp = getLimaParts(new Date());
    const ahoraLima = new Date(lp.y, lp.m, lp.d, lp.h, lp.min, 0);
    
    const pFecha = new Date(proximaVentana.fecha);
    const y = pFecha.getUTCFullYear();
    const m = pFecha.getUTCMonth();
    const d = pFecha.getUTCDate();
    const [hIni, mIni] = proximaVentana.horaInicio.split(':').map(Number);
    const [hFin, mFin] = proximaVentana.horaFin.split(':').map(Number);
    
    // Comparamos en el mismo espacio "local" del navegador
    const fechaInicio = new Date(y, m, d, hIni, mIni, 0);
    const fechaFin = new Date(y, m, d, hFin, mFin, 0);

    const activa = ahoraLima >= fechaInicio && ahoraLima <= fechaFin;
    const futura = ahoraLima < fechaInicio;

    if (activa) {
      bannerElement = (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-100 flex-shrink-0" />
            <div>
              <p className="font-bold text-base">¡Tu ventana de atención está activa!</p>
              <p className="text-sm text-emerald-50">
                Puedes registrar y modificar tu horario. Finaliza hoy a las {proximaVentana.horaFin}.
              </p>
            </div>
          </div>
          <Boton
            onClick={() => router.push('/dashboard/horarios/seleccion')}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-6 py-2 border-none shadow-sm flex-shrink-0 w-full md:w-auto"
          >
            Elegir mi Horario
          </Boton>
        </div>
      );
    } else if (futura) {
      const formattedDate = pFecha.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      bannerElement = (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800 text-base">Próxima Ventana de Atención Programada</p>
              <p className="text-sm text-slate-600">
                Tu turno es el <span className="font-semibold text-indigo-700">{formattedDate}</span> desde las{' '}
                <span className="font-semibold text-indigo-700">{proximaVentana.horaInicio}</span> hasta las{' '}
                <span className="font-semibold text-indigo-700">{proximaVentana.horaFin}</span>.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full flex-shrink-0">
            Pendiente
          </span>
        </div>
      );
    } else {
      bannerElement = (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm text-slate-600">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-slate-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-700">Tu ventana de atención finalizó</p>
              <p className="text-sm">
                El plazo para registrar tu horario de forma directa ha terminado el {pFecha.toLocaleDateString('es-PE')} a las {proximaVentana.horaFin}.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 bg-slate-200 px-3 py-1 rounded-full flex-shrink-0">
            Cerrado
          </span>
        </div>
      );
    }
  } else {
    bannerElement = (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm text-amber-800">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold">Sin ventana de atención configurada</p>
            <p className="text-sm">
              No tienes un turno asignado para el periodo actual. Comunícate con secretaría si necesitas registrar tu horario.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1 rounded-full flex-shrink-0">
          No Asignado
        </span>
      </div>
    );
  }

  const horasRequeridas = resumen?.horasRequeridas ?? 0;
  const horasAsignadas = resumen?.horasAsignadas ?? 0;
  const porcentaje = resumen?.porcentaje ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white shadow-xl relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
              Panel Docente
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                ¡Bienvenido, {nombreDocente}!
              </h1>
              <p className="text-sm text-white/80 sm:text-base">
                Categoría: <span className="font-semibold text-white">{resumen?.docente?.categoria}</span> | Modalidad: <span className="font-semibold text-white">{resumen?.docente?.modalidad}</span>
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Período académico</p>
            <div className="mt-3">
              <Selector
                value={idPeriodo}
                onChange={(e: any) => setIdPeriodoSeleccionado(Number(e.target.value))}
                className="mt-0 border-white/20 bg-white/95 text-slate-900 shadow-none focus:border-white focus:ring-white/30"
              >
                <option value={0}>-- Seleccionar período --</option>
                {periodos?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Selector>
            </div>
          </div>
        </div>
      </div>

      {/* Ventana de atencion banner */}
      {bannerElement}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 text-slate-100 font-bold text-6xl select-none pointer-events-none">H</div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Horas Semanales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold text-slate-900">
              {horasAsignadas}h <span className="text-lg font-normal text-slate-500">/ {horasRequeridas}h</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', porcentaje >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Progreso total: <span className="font-bold text-slate-700">{porcentaje}%</span> de horas asignadas.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 text-slate-100 font-bold text-6xl select-none pointer-events-none">C</div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Cursos Asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900">
              {(resumen?.componentes || []).length}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Cursos ofertados asignados a tu carga académica.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 text-slate-100 font-bold text-6xl select-none pointer-events-none">B</div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Bloques de Horario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Confirmados:
              </span>
              <span className="font-bold text-slate-800 font-mono">{resumen?.bloquesConfirmados ?? 0}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-50 pt-2">
              <span className="text-sm text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Borradores:
              </span>
              <span className="font-bold text-slate-800 font-mono">{resumen?.bloquesBorrador ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Course breakdown list */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Cursos y Progreso de Carga
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(resumen?.componentes || []).length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No tienes cursos asignados para este periodo académico.
              </div>
            ) : (
              <div className="space-y-5">
                {(resumen?.componentes || []).map((c: any) => (
                  <div key={c.idComponente} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{c.nombreCurso}</h4>
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1">
                          {c.tipoComponente}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {c.horasAsignadas}h <span className="text-slate-400 font-normal">/ {c.horasRequeridas}h</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', c.porcentaje >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                          style={{ width: `${Math.min(c.porcentaje, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>Horas programadas</span>
                        <span>{c.porcentaje}% completado</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions & downloads */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-500" />
                Accesos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Boton
                onClick={() => router.push('/dashboard/docente/carga-no-lectiva')}
                className="w-full justify-start text-left bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100 font-semibold"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                Registrar Carga No Lectiva
              </Boton>
              <Boton
                onClick={() => router.push('/dashboard/horarios/seleccion')}
                className="w-full justify-start text-left bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 font-semibold"
              >
                ✏️ Elegir mi Horario (Matriz)
              </Boton>
              <Boton
                onClick={() => router.push('/dashboard/horarios/vista-docente')}
                variante="borde"
                className="w-full justify-start text-left font-semibold text-slate-700"
              >
                👁️ Ver mi Horario Completo
              </Boton>
              <Boton
                onClick={() => router.push('/dashboard/notificaciones/preferencias')}
                variante="borde"
                className="w-full justify-start text-left font-semibold text-slate-700"
              >
                ⚙️ Configurar Notificaciones
              </Boton>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-500" />
                Descargar Entregables
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Tipo de exportación</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportOption"
                      value="completo"
                      checked={exportOption === 'completo'}
                      onChange={(e) => setExportOption(e.target.value as any)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm text-slate-700">Horario completo (carga lectiva + no lectiva)</span>
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
                    <span className="text-sm text-slate-700">Solo carga lectiva</span>
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
                    <span className="text-sm text-slate-700">Solo carga no lectiva</span>
                  </label>
                </div>
              </div>
              <Boton
                onClick={() => handleDescargarReporte('excel')}
                disabled={descargando !== null}
                className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold"
              >
                <Clock className="h-4 w-4 text-emerald-500" />
                {descargando === 'excel' ? 'Generando Excel...' : 'Descargar Horario Excel'}
              </Boton>
              <Boton
                onClick={() => handleDescargarReporte('pdf')}
                disabled={descargando !== null}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                {descargando === 'pdf' ? 'Generando PDF...' : 'Descargar Horario PDF'}
              </Boton>
            </CardContent>
          </Card>
        </div>
      </div>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
