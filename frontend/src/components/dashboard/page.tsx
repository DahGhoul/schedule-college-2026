 'use client';
import { useState } from 'react';
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
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { Select } from '@/components/ui/Selector';

export default function DashboardPage() {
  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const { data: periodos } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const [idPeriodoSeleccionado, setIdPeriodoSeleccionado] = useState<number>(periodoActivo?.id || 0);
  const idPeriodo = idPeriodoSeleccionado || periodoActivo?.id || 0;

  const { usuario } = useAuthStore();

  const { data: resumen, isLoading: resumenLoading } = useResumen(idPeriodo);
  const { data: avanceCategoria } = useAvanceCategoria(idPeriodo);
  const { data: ocupacion } = useOcupacionAmbientes(idPeriodo);
  const { data: mapaCalor } = useMapaCalor(idPeriodo);
  const { data: cargaDocente } = useCargaDocente(idPeriodo);
  const eventos = useActividadTiempoReal();

  if (periodoLoading || resumenLoading) return <SpinnerCarga />;

  const kpis = resumen
    ? [
        { etiqueta: 'Docentes', valor: resumen.totalDocentes },
        { etiqueta: 'Cursos', valor: resumen.totalCursos },
        { etiqueta: 'Ambientes', valor: resumen.totalAmbientes },
        { etiqueta: 'Horarios Asignados', valor: `${resumen.horariosAsignados} (${resumen.porcentajeAsignado}%)` },
      ]
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-unt-primary to-[#002244] rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Background Accent Graphics */}
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 bg-unt-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-2 relative z-10">
          <pre className="font-mono text-base leading-6">
{`│      DASHBOARD DOCENTE - ${usuario?.nombres || ''} ${usuario?.apellidos || ''}                │`}
{`│   Categoría: ${usuario?.categoria || usuario?.rol || 'Principal Nombrado'}                                           │`}
          </pre>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Panel personal del docente. Selecciona el período para actualizar las métricas.
          </p>
        </div>
        
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-unt-accent/20 flex items-center justify-center">
            <span className="text-unt-accent text-lg">📅</span>
          </div>
          <div>
            <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Período Académico</p>
            <div className="flex items-center gap-2">
              <Select
                value={idPeriodo}
                onChange={(e: any) => setIdPeriodoSeleccionado(Number(e.target.value))}
                className="bg-white/10 text-white"
              >
                <option value={0}>-- Seleccionar período --</option>
                {periodos?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>

      <PanelKPIs kpis={kpis} />

      {/* Docente summary + acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h3 className="font-semibold">Resumen de asignaciones</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded">
                <div className="text-sm text-gray-500">Total de cursos asignados (teoría + laboratorio)</div>
                <div className="mt-2 text-2xl font-bold">{resumen?.totalCursos ?? 0}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded">
                <div className="text-sm text-gray-500">Horas semanales requeridas vs programadas</div>
                <div className="mt-2 text-lg font-medium">{resumen?.horasRequeridas ?? 'N/A'} / {resumen?.horasProgramadas ?? 'N/A'}</div>
              </div>
            </div>

            <div className="mt-4">
              {avanceCategoria && <GraficoAvanceCategoria datos={avanceCategoria} />}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h3 className="font-semibold mb-2">Mapa de uso</h3>
            {mapaCalor && (
              <MapaCalorOcupacion dias={mapaCalor.dias} horas={mapaCalor.horas} conteo={mapaCalor.conteo} />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h4 className="font-semibold">Accesos rápidos</h4>
            <div className="mt-3 flex flex-col gap-2">
              <Boton onClick={() => (window.location.href = '/dashboard/horarios/seleccion')}>Ir a selección de horario</Boton>
              <Boton onClick={() => (window.location.href = '/dashboard/horarios/vista-docente')}>Ver mi horario completo</Boton>
              <Boton onClick={() => (window.location.href = '/dashboard/reportes')}>Descargar reporte PDF de mi horario</Boton>
              <Boton onClick={() => (window.location.href = '/dashboard/notificaciones/preferencias')}>Gestionar preferencias de notificación</Boton>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h4 className="font-semibold">Actividad</h4>
            <ActividadTiempoReal eventos={eventos} />
          </div>
        </aside>
      </div>
    </div>
  );
}