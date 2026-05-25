'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { periodosService } from '@/services/periodos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { LayoutGrid, Filter, BookOpen, Clock, Users, GraduationCap, Trash2 } from 'lucide-react';

export default function OfertaPorCiclosPage() {
  const queryClient = useQueryClient();
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  // Obtener periodo activo
  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data),
  });

  const periodoActivo = periodos?.find((p: any) => p.activo);

  // Obtener cursos por ciclo
  const { data: cursos, isLoading: isLoadingCursos } = useQuery({
    queryKey: ['cursos-oferta-ciclo', periodoActivo?.id, cicloSeleccionado],
    queryFn: () => cargaHorariaService.obtenerCursosPorCiclo(periodoActivo.id, cicloSeleccionado!).then(res => res.data),
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

  // Ciclos del 1 al 10
  const ciclos = Array.from({ length: 10 }, (_, i) => ({
    valor: String(i + 1),
    etiqueta: `Ciclo ${i + 1}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-8 h-8 text-unt-primary" />
            Oferta por Ciclos
          </h1>
          <p className="text-slate-500 mt-1">
            Visualiza los cursos y componentes asignados a cada ciclo académico.
          </p>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Filtrar Ciclo:</span>
            </div>

            <div className="w-64">
              <Selector
                label="Ciclo Académico"
                opciones={ciclos}
                value={cicloSeleccionado?.toString() || ''}
                onChange={(e) => setCicloSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
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
          {cursos.map((curso: any) => (
            <Card key={curso.id} className="group hover:shadow-2xl transition-all duration-300 rounded-[2rem] border-slate-200/60 overflow-hidden bg-white hover:-translate-y-1">
              <div className="h-2 bg-unt-primary w-full opacity-80 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-unt-primary/10 text-unt-primary text-[10px] font-bold px-2.5 py-1 rounded-full border border-unt-primary/20 uppercase">
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
                        <div className={`p-2 rounded-xl ${comp.tipo === 'TEORIA' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                          }`}>
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {comp.tipo === 'TEORIA' ? 'TEORÍA-PRÁCTICA' : 'LABORATORIO'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">{comp.horas_semanales} horas/semana</p>
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
          ))}
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
