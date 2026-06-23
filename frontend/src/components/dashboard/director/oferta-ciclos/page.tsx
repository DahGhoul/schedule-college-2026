'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utilidades';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { periodosService } from '@/services/periodos.service';
import { curriculaService } from '@/services/curricula.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { LayoutGrid, Filter, BookOpen, Clock, Users, GraduationCap, Trash2 } from 'lucide-react';

export default function OfertaPorCiclosPage() {
  const queryClient = useQueryClient();
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);
  const [idCurricula, setIdCurricula] = useState<number | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const getCardColor = (id: number) => {
    const colors = [
      { bg: 'bg-blue-50/50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-100', accent: 'bg-blue-600' },
      { bg: 'bg-indigo-50/50', icon: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-100', accent: 'bg-indigo-600' },
      { bg: 'bg-violet-50/50', icon: 'bg-violet-100 text-violet-600', border: 'border-violet-100', accent: 'bg-violet-600' },
      { bg: 'bg-emerald-50/50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600' },
      { bg: 'bg-amber-50/50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-100', accent: 'bg-amber-600' },
      { bg: 'bg-rose-50/50', icon: 'bg-rose-100 text-rose-600', border: 'border-rose-100', accent: 'bg-rose-600' },
      { bg: 'bg-cyan-50/50', icon: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100', accent: 'bg-cyan-600' },
    ];
    return colors[id % colors.length];
  };

  // Obtener periodos
  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data),
  });

  const periodoActivo = periodos?.find((p: any) => p.activo);

  // Obtener currículas
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculaService.listar().then(res => res.data),
  });

  const curriculaVigente = curricula?.find((c: any) => c.vigente);

  useEffect(() => {
    if (curriculaVigente && idCurricula === null) {
      setIdCurricula(curriculaVigente.id);
    }
  }, [curriculaVigente, idCurricula]);

  // Obtener ciclos del periodo activo
  const { data: ciclos, isLoading: isLoadingCiclos } = useQuery({
    queryKey: ['ciclos', periodoActivo?.id],
    queryFn: () => periodosService.obtenerCiclosActivo().then(res => res.data),
    enabled: !!periodoActivo,
  });

  // Ciclos formateados para el selector
  const opcionesCiclos = (ciclos || []).map((c: any) => ({
    valor: String(c.id),
    etiqueta: `Ciclo ${c.numero}`,
  }));

  // Auto-seleccionar primer ciclo cuando carguen
  useEffect(() => {
    if (ciclos && ciclos.length > 0 && !cicloSeleccionado) {
      setCicloSeleccionado(ciclos[0].id);
    }
  }, [ciclos, cicloSeleccionado]);

  // Obtener cursos por ciclo y currícula
  const { data: cursos, isLoading: isLoadingCursos } = useQuery({
    queryKey: ['cursos-oferta-ciclo', periodoActivo?.id, cicloSeleccionado, idCurricula],
    queryFn: () => cargaHorariaService.obtenerCursosPorCiclo(periodoActivo.id, cicloSeleccionado!, idCurricula!).then(res => res.data),
    enabled: !!periodoActivo && !!cicloSeleccionado,
  });

  const mutationEliminar = useMutation({
    mutationFn: (id: number) => cargaHorariaService.eliminarOferta(id),
    onSuccess: () => {
      setToast({ mensaje: 'Oferta de curso eliminada correctamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['cursos-oferta-ciclo'] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al eliminar oferta', tipo: 'error' });
    }
  });

  const alEliminar = (curso: any) => {
    if (confirm(`¿Está seguro de eliminar la oferta del curso "${curso.curso?.nombre}" para este ciclo? Esta acción no se puede deshacer si no hay horarios asociados.`)) {
      mutationEliminar.mutate(curso.id);
    }
  };

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <LayoutGrid className="w-3.5 h-3.5" />
              Catálogo por Ciclo
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Oferta por Ciclos</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Visualiza los cursos, componentes y distribución por grupos de cada ciclo académico del periodo.
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Filtrar Ciclo y Currícula:</span>
            </div>

            <div className="w-64">
              <Selector
                label="Ciclo Académico"
                opciones={opcionesCiclos}
                value={cicloSeleccionado?.toString() || ''}
                onChange={(e) => setCicloSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div className="w-72">
              <Selector
                label="Currícula"
                value={idCurricula?.toString() || ''}
                onChange={(e) => setIdCurricula(e.target.value ? parseInt(e.target.value) : null)}
                opciones={(curricula || []).map((c: any) => ({
                  valor: String(c.id),
                  etiqueta: `${c.codigo} - ${c.nombre}${c.vigente ? ' (Vigente)' : ''}`
                }))}
              />
            </div>

            {periodoActivo && (
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-unt-primary/10 text-unt-primary rounded-xl text-sm font-bold border border-unt-primary/20">
                <BookOpen className="w-4 h-4" />
                Periodo: {periodoActivo.nombre}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!cicloSeleccionado ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <LayoutGrid className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Seleccione un ciclo académico para visualizar su oferta.</p>
        </div>
      ) : isLoadingCursos ? (
        <div className="py-20 flex justify-center">
          <SpinnerCarga />
        </div>
      ) : cursos && cursos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((curso: any) => {
            const color = getCardColor(curso.id);
            return (
              <Card key={curso.id} className="group hover:shadow-2xl transition-all duration-300 rounded-[2rem] border-slate-200/60 overflow-hidden bg-white hover:-translate-y-1">
                <div className={cn("h-2 w-full opacity-80 group-hover:opacity-100 transition-opacity", color.accent)} />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase", color.icon, color.border)}>
                        {curso.curso?.codigo}
                      </div>
                      <button
                        onClick={() => alEliminar(curso)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar oferta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold">
                      <GraduationCap className="w-3 h-3" />
                      {curso.curso?.creditos} CRÉDITOS
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2 leading-tight group-hover:text-unt-primary transition-colors">
                    {curso.curso?.nombre}
                  </h3>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Componentes:</p>
                    {curso.componentes && curso.componentes.map((comp: any) => (
                      <div key={comp.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-unt-primary/30 transition-all group/comp">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-xl", comp.tipo === 'TEORIA' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')}>
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {comp.tipo === 'TEORIA' ? 'TEORÍA-PRÁCTICA' : 'LABORATORIO'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {comp.horas_requeridas / (comp.grupos?.length || 1)}h/semana
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                            <Users className="w-3 h-3" />
                            {comp.grupos?.length || 0} GRUPOS
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No se encontraron cursos asignados a este ciclo.</p>
        </div>
      )}

      {toast && (
        <NotificacionToast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
