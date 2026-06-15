'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { useResumen, useAvanceCategoria, useOcupacionAmbientes, useMapaCalor, useCargaDocente } from '@/hooks/useEstadisticas';
import { useActividadTiempoReal } from '@/hooks/useActividadTiempoReal';
import { PanelKPIs } from '@/components/dashboard/PanelKPIs';
import { GraficoAvanceCategoria } from '@/components/dashboard/GraficoAvanceCategoria';
import { GraficoOcupacionAmbientes } from '@/components/dashboard/GraficoOcupacionAmbientes';
import { MapaCalorOcupacion } from '@/components/dashboard/MapaCalorOcupacion';
import { ActividadTiempoReal } from '@/components/dashboard/ActividadTiempoReal';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { AlertTriangle, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { usuario } = useAuthStore();

  const { data: solicitudesPendientes } = useQuery({
    queryKey: ['solicitudes-pendientes-count'],
    queryFn: () => apiClient.get('/horarios/pendientes-ambiente').then(res => res.data),
    enabled: usuario?.rol === 'DIRECTOR'
  });

  // const alertaAmbientes = useMemo(() => {
  //   if (!solicitudesPendientes) return null;
  //   return solicitudesPendientes.length > 5 ? {
  //     nivel: 'critico',
  //     mensaje: `¡Alerta! Hay ${solicitudesPendientes.length} horarios sin ambiente asignado. Se requiere buscar nuevos ambientes urgentemente.`,
  //   } : solicitudesPendientes.length > 0 ? {
  //     nivel: 'advertencia',
  //     mensaje: `Hay ${solicitudesPendientes.length} solicitudes de aula pendientes de revisión.`,
  //   } : null;
  // }, [solicitudesPendientes]);
  const alertaAmbientes = null;

  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo-admin'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: periodos } = useQuery({
    queryKey: ['periodos-lista-admin'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const [idPeriodoSeleccionado, setIdPeriodoSeleccionado] = useState<number>(0);
  const idPeriodo = idPeriodoSeleccionado || periodoActivo?.id || 0;

  const { data: resumen, isLoading: resumenLoading } = useResumen(idPeriodo);
  const { data: avanceCategoria } = useAvanceCategoria(idPeriodo);
  const { data: ocupacion } = useOcupacionAmbientes(idPeriodo);
  const { data: mapaCalor } = useMapaCalor(idPeriodo);
  const { data: cargaDocente } = useCargaDocente(idPeriodo);
  const eventos = useActividadTiempoReal();

  const ocupacionTop = useMemo(() => (ocupacion || []).slice(0, 8), [ocupacion]);

  const kpis = resumen
    ? [
        { etiqueta: 'Docentes', valor: resumen.totalDocentes },
        { etiqueta: 'Cursos', valor: resumen.totalCursos },
        { etiqueta: 'Ambientes', valor: resumen.totalAmbientes },
        { etiqueta: 'Horarios asignados', valor: `${resumen.horariosAsignados} (${resumen.porcentajeAsignado}%)` },
      ]
    : [];

  const tituloPanel = usuario?.rol === 'DIRECTOR' 
    ? 'Panel de Dirección de Escuela' 
    : usuario?.rol === 'SECRETARIA' 
    ? 'Panel de Secretaría Académica' 
    : 'Panel Administrativo General';

  const descripcionPanel = usuario?.rol === 'DIRECTOR'
    ? 'Supervisión de carga horaria, oferta académica y validación de límites legales por docente.'
    : 'Gestión de infraestructura, asignación de aulas y monitoreo de la programación académica.';

  if (periodoLoading || resumenLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white sm:px-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-unt-accent/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                {usuario?.rol || 'SISTEMA'}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tituloPanel}</h1>
                <p className="text-sm leading-6 text-white/80 sm:text-base">
                  {descripcionPanel}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Usuario</p>
                  <p className="mt-1 font-medium text-white">{usuario?.rol === 'DIRECTOR' ? 'Director de Escuela' : usuario?.nombre || usuario?.email || 'Administrador'}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Rol</p>
                  <p className="mt-1 font-medium text-white">{usuario?.rol || 'ADMINISTRADOR'}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Período activo</p>
                  <p className="mt-1 font-medium text-white">{periodoActivo?.nombre || 'No definido'}</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md">
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
              <p className="mt-3 text-xs leading-5 text-white/70">
                Cambia el período para revisar el estado general de la institución.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PanelKPIs kpis={kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Resumen institucional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total horarios</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{resumen?.totalHorarios ?? 0}</div>
                  <p className="mt-2 text-sm text-slate-500">Asignados y en borrador.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Avance general</div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{resumen?.horariosAsignados ?? 0} / {resumen?.totalHorarios ?? 0}</div>
                  <p className="mt-2 text-sm text-slate-500">Horarios confirmados o publicados.</p>
                </div>
              </div>
              <div className="mt-4">{avanceCategoria && <GraficoAvanceCategoria datos={avanceCategoria} />}</div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Ocupación de ambientes</CardTitle>
              </CardHeader>
              <CardContent>
                {ocupacionTop.length > 0 && <GraficoOcupacionAmbientes datos={ocupacionTop} />}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Mapa de uso</CardTitle>
              </CardHeader>
              <CardContent>
                {mapaCalor && <MapaCalorOcupacion dias={mapaCalor.dias} horas={mapaCalor.horas} conteo={mapaCalor.conteo} />}
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Carga docente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {(cargaDocente || []).slice(0, 8).map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{item.nombres} {item.apellidos}</p>
                      <span className="text-xs font-semibold text-slate-500">{item.porcentajeCumplimiento}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.modalidad} | {item.categoria}</p>
                    <p className="mt-2 text-sm text-slate-700">{item.horasAsignadas}h asignadas / {item.horasRequeridas}h requeridas</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <ActividadTiempoReal eventos={eventos} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Boton onClick={() => window.location.href = '/dashboard/docentes'}>Administrar docentes</Boton>
                <Boton onClick={() => window.location.href = '/dashboard/horarios'}>Gestor de horarios</Boton>
                <Boton onClick={() => window.location.href = '/dashboard/reportes'}>Generar reportes</Boton>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
