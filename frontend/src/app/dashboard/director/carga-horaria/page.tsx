'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { docentesService } from '@/services/docentes.service';
import { cursosService } from '@/services/cursos.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Modal } from '@/components/ui/Modal';
import { Users, BookOpen, AlertCircle, Save, Plus, Clock, GraduationCap, ArrowRight } from 'lucide-react';

export default function CargaHorariaPage() {
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [modalAsignacion, setModalAsignacion] = useState(false);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<any>(null);
  const [idDocente, setIdDocente] = useState<number>(0);
  const [horasAsignadas, setHorasAsignadas] = useState<number>(0);

  const { data: responsePeriodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data)
  });
  const periodos = Array.isArray(responsePeriodos) ? responsePeriodos : responsePeriodos?.data || [];

  const { data: responseDocentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar({}).then(res => res.data)
  });
  const docentes = Array.isArray(responseDocentes) ? responseDocentes : responseDocentes?.data || [];

  const { data: responseResumen } = useQuery({
    queryKey: ['resumen-carga', idPeriodo],
    queryFn: () => cargaHorariaService.obtenerResumen(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });
  const resumenCarga = Array.isArray(responseResumen) ? responseResumen : responseResumen?.data || [];

  const { data: cursosConOferta, isLoading: loadingOferta } = useQuery({
    queryKey: ['cursos-con-oferta', idPeriodo],
    queryFn: async () => {
      const res = await cursosService.listar().then(res => res.data);
      const cursos = Array.isArray(res) ? res : res?.data || [];
      const detalles = await Promise.all(
        cursos.map(async (c: any) => {
          const detRes = await cursosService.obtener(c.id).then(res => res.data);
          return {
            ...c,
            oferta: detRes.ofertas?.find((o: any) => o.id_periodo === idPeriodo)
          };
        })
      );
      return detalles.filter(d => d.oferta);
    },
    enabled: idPeriodo > 0
  });

  const mutationAsignar = useMutation({
    mutationFn: (datos: any) => cargaHorariaService.asignarCarga(datos),
    onSuccess: () => {
      setToast({ mensaje: 'Carga horaria asignada correctamente', tipo: 'exito' });
      setModalAsignacion(false);
      queryClient.invalidateQueries({ queryKey: ['resumen-carga', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['cursos-con-oferta', idPeriodo] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al asignar carga', tipo: 'error' });
    }
  });

  const abrirModalAsignacion = (comp: any) => {
    setComponenteSeleccionado(comp);
    setHorasAsignadas(comp.horas_requeridas);
    setIdDocente(0);
    setModalAsignacion(true);
  };

  const manejarAsignar = () => {
    if (!idDocente || !horasAsignadas) return;
    mutationAsignar.mutate({
      id_componente: componenteSeleccionado.id,
      id_docente: idDocente,
      horas_asignadas: horasAsignadas
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Carga Horaria</h1>
          <p className="text-slate-500 mt-1">Asigna docentes a los componentes de cada curso para el período lectivo.</p>
        </div>
        <div className="w-full sm:w-72">
          <Selector
            label="Seleccionar Período Lectivo"
            value={idPeriodo}
            onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
          >
            <option value={0}>-- Elegir período --</option>
            {periodos.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Selector>
        </div>
      </div>

      {!idPeriodo ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Clock className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">No se ha seleccionado un período</h2>
          <p className="text-slate-500 max-w-sm mt-2">Por favor, elige un período académico en la parte superior para gestionar la carga horaria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Cursos y sus Componentes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-unt-primary" /> Oferta Académica
              </h2>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                {cursosConOferta?.length || 0} Cursos
              </span>
            </div>

            {loadingOferta ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-[2rem]" />)}
              </div>
            ) : (
              cursosConOferta?.map((curso: any) => (
                <Card key={curso.id} className="border-none shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-unt-primary uppercase tracking-wider">Ciclo {curso.oferta.id_ciclo}</span>
                      <h3 className="font-bold text-slate-900">{curso.codigo} - {curso.nombre}</h3>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid gap-4">
                      {curso.oferta.componentes.map((comp: any) => {
                        const horasAsignadasActual = comp.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
                        const faltan = comp.horas_requeridas - horasAsignadasActual;
                        
                        return (
                          <div key={comp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-unt-primary/30 transition-all gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  comp.tipo === 'TEORIA' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {comp.tipo}
                                </span>
                                <span className="text-xs font-medium text-slate-500">{comp.horas_requeridas}h Requeridas</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                {comp.asignaciones.map((asig: any) => (
                                  <div key={asig.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs shadow-sm">
                                    <span className="font-bold text-slate-700">{asig.docente.apellidos}</span>
                                    <span className="text-slate-400">({asig.horas_asignadas}h)</span>
                                  </div>
                                ))}
                                {faltan > 0 && (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] font-bold uppercase">
                                    <AlertCircle className="w-3 h-3" /> Faltan {faltan}h
                                  </div>
                                )}
                              </div>
                            </div>
                            <Boton size="sm" variant="outline" onClick={() => abrirModalAsignacion(comp)} className="rounded-xl">
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Asignar Docente
                            </Boton>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Resumen de Carga Docente */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-unt-primary" /> Carga Docente
            </h2>
            
            <div className="grid gap-4">
              {resumenCarga?.map((docente: any) => {
                const horasAsignadasTotal = docente.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
                const limite = docente.horas_max_semana || 40;
                const porcentaje = Math.min(100, (horasAsignadasTotal / limite) * 100);
                const colorBarra = porcentaje > 95 ? 'bg-red-500' : porcentaje > 80 ? 'bg-amber-500' : 'bg-emerald-500';

                return (
                  <Card key={docente.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <p className="font-bold text-sm text-slate-900 leading-tight">{docente.apellidos}, {docente.nombres}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <GraduationCap className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{docente.categoria}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-extrabold ${porcentaje > 95 ? 'text-red-600' : 'text-slate-700'}`}>
                            {horasAsignadasTotal} / {limite}h
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`${colorBarra} h-full rounded-full transition-all duration-1000 ease-out`} 
                          style={{ width: `${porcentaje}%` }} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={modalAsignacion} 
        onClose={() => setModalAsignacion(false)} 
        titulo="Asignación de Carga Horaria"
      >
        <div className="space-y-6">
          <div className="p-4 bg-unt-primary/5 border border-unt-primary/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-unt-primary text-white rounded-lg">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-unt-primary uppercase tracking-widest">Componente a asignar</p>
                <p className="font-bold text-slate-900">{componenteSeleccionado?.tipo} ({componenteSeleccionado?.horas_requeridas}h totales)</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <Selector
              label="Seleccionar Docente Disponible"
              value={idDocente}
              onChange={(e: any) => setIdDocente(Number(e.target.value))}
            >
              <option value={0}>-- Elegir de la lista --</option>
              {docentes.map((d: any) => (
                <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres} ({d.categoria})</option>
              ))}
            </Selector>

            <CampoTexto
              label="Horas a Asignar"
              type="number"
              min={1}
              max={componenteSeleccionado?.horas_requeridas}
              value={horasAsignadas}
              onChange={(e) => setHorasAsignadas(Number(e.target.value))}
              ayuda={`Máximo permitido: ${componenteSeleccionado?.horas_requeridas} horas`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={() => setModalAsignacion(false)} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton 
              onClick={manejarAsignar} 
              cargando={mutationAsignar.isPending} 
              disabled={!idDocente || !horasAsignadas}
              className="rounded-xl px-8 shadow-md shadow-unt-primary/10"
            >
              Confirmar Asignación <ArrowRight className="w-4 h-4 ml-2" />
            </Boton>
          </div>
        </div>
      </Modal>

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
