'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { periodosService } from '@/services/periodos.service';
import { horariosService } from '@/services/horarios.service';
import { useCargaDocente } from '@/hooks/useEstadisticas';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardDocentePage() {
  const router = useRouter();
  const { usuario } = useAuthStore();

  const nombreDocente = usuario?.docente?.nombres || usuario?.nombre || 'Juan Pérez Gómez';
  const apellidoDocente = usuario?.docente?.apellidos || '';
  const categoria = usuario?.docente?.categoria || usuario?.categoria || 'Principal Nombrado';
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

  const { data: cargaDocente, isLoading: cargaLoading } = useCargaDocente(idPeriodo);
  const { data: horariosDocente, isLoading: horariosLoading } = useQuery({
    queryKey: ['horarios-docente-dashboard', docenteId, idPeriodo],
    queryFn: () => horariosService.listarHorarios({ idDocente: docenteId, idPeriodo }).then((res) => res.data),
    enabled: !!docenteId && !!idPeriodo,
  });

  const registroDocente = (cargaDocente || []).find((item: any) => item.id === docenteId);
  const horarios = horariosDocente || [];

  const totalCursos = useMemo(() => {
    const ids = new Set<number>();
    horarios.forEach((horario: any) => {
      const idCurso = horario.id_curso ?? horario.idCurso ?? horario.curso?.id;
      if (typeof idCurso === 'number') ids.add(idCurso);
    });
    return ids.size;
  }, [horarios]);

  const horasTeoria = useMemo(
    () => horarios.filter((horario: any) => (horario.tipo_clase ?? horario.tipo ?? '').toUpperCase() === 'TEORIA').length,
    [horarios]
  );
  const horasLaboratorio = useMemo(
    () => horarios.filter((horario: any) => (horario.tipo_clase ?? horario.tipo ?? '').toUpperCase() === 'LABORATORIO').length,
    [horarios]
  );

  const horasRequeridas = registroDocente?.horasRequeridas ?? 0;
  const horasProgramadas = registroDocente?.horasAsignadas ?? 0;

  const graficoHoras = [
    { nombre: 'Teoría', horas: horasTeoria },
    { nombre: 'Laboratorio', horas: horasLaboratorio },
  ];

  if (periodoLoading || cargaLoading || horariosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white sm:px-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-unt-accent/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                Panel docente
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  DASHBOARD DOCENTE - {nombreDocente} {apellidoDocente}
                </h1>
                <p className="text-sm leading-6 text-white/80 sm:text-base">Categoría: {categoria}</p>
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
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Total de cursos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold text-slate-900">{totalCursos}</div>
            <p className="mt-2 text-sm text-slate-500">En el período activo, teoría + laboratorio.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Total de horas semanales requeridas vs. horas ya programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">
              {horasRequeridas}h / {horasProgramadas}h
            </div>
            <p className="mt-2 text-sm text-slate-500">Requeridas frente a las ya programadas en horario.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Horas de teoría vs. horas de laboratorio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{horasTeoria}h / {horasLaboratorio}h</div>
            <p className="mt-2 text-sm text-slate-500">Distribución de horas dentro del horario.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Gráfico de horas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={graficoHoras}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="horas" fill="#003366" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Boton onClick={() => router.push('/dashboard/horarios/seleccion')}>Ir a selección de horario</Boton>
                <Boton onClick={() => router.push('/dashboard/horarios/vista-docente')}>Ver mi horario completo</Boton>
                <Boton onClick={() => router.push('/dashboard/reportes')}>Descargar reporte PDF de mi horario</Boton>
                <Boton onClick={() => router.push('/dashboard/notificaciones/preferencias')}>Gestionar preferencias de notificación</Boton>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Resumen académico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cursos asignados</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCursos}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Horas programadas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{horasProgramadas}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Horas requeridas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{horasRequeridas}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
