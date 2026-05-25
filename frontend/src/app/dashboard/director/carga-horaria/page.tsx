'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { docentesService } from '@/services/docentes.service';
import { cursosService } from '@/services/cursos.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Modal } from '@/components/ui/Modal';
import { Users, BookOpen, AlertCircle, Plus, Clock, GraduationCap, ArrowRight, CheckCircle2, Trash2, Edit2 } from 'lucide-react';

export default function CargaHorariaPage() {
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [modalAsignacion, setModalAsignacion] = useState(false);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<any>(null);
  const [idDocente, setIdDocente] = useState<number>(0);
  const [horasAsignadas, setHorasAsignadas] = useState<number>(0);
  const [asignacionEditando, setAsignacionEditando] = useState<any>(null);

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
    mutationFn: (datos: any) => {
      if (asignacionEditando) {
        return cargaHorariaService.actualizarAsignacion(asignacionEditando.id, datos);
      }
      return cargaHorariaService.asignarCarga(datos);
    },
    onSuccess: () => {
      setToast({ mensaje: 'Carga horaria procesada correctamente', tipo: 'exito' });
      setModalAsignacion(false);
      queryClient.invalidateQueries({ queryKey: ['resumen-carga', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['cursos-con-oferta', idPeriodo] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al procesar carga', tipo: 'error' });
    }
  });

  const mutationEliminar = useMutation({
    mutationFn: (id: number) => cargaHorariaService.eliminarAsignacion(id),
    onSuccess: () => {
      setToast({ mensaje: 'Asignación eliminada', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['resumen-carga', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['cursos-con-oferta', idPeriodo] });
    }
  });

  const abrirModalAsignacion = (comp: any, asig?: any) => {
    setComponenteSeleccionado(comp);
    if (asig) {
      setAsignacionEditando(asig);
      setIdDocente(asig.id_docente);
      setHorasAsignadas(asig.horas_asignadas);
    } else {
      setAsignacionEditando(null);
      setIdDocente(0);
      setHorasAsignadas(comp.horas_requeridas);
    }
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

  const manejarEliminarAsignacion = (id: number) => {
    if (confirm('¿Seguro que desea eliminar esta asignación?')) {
      mutationEliminar.mutate(id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Carga Horaria</h1>
          <p className="text-slate-500 mt-1">Asigna docentes a los componentes de cada curso.</p>
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
          <Clock className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">No se ha seleccionado un período</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-unt-primary" /> Oferta Académica
            </h2>

            {loadingOferta ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-[2rem]" />)}
              </div>
            ) : (
              cursosConOferta?.map((curso: any) => (
                <Card key={curso.id} className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">{curso.codigo} - {curso.nombre}</h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid gap-4">
                      {curso.oferta.componentes.map((comp: any) => {
                        const horasAsignadasActual = comp.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
                        const faltan = comp.horas_requeridas - horasAsignadasActual;
                        const nGrupos = comp.grupos?.length || 1;
                        
                        return (
                          <div key={comp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                                  {comp.tipo}
                                </span>
                                <span className="text-sm font-bold text-slate-700">
                                  Carga Total: {comp.horas_requeridas}h
                                  {nGrupos > 1 && (
                                    <span className="text-[10px] text-slate-500 font-medium ml-2 bg-slate-100 px-2 py-0.5 rounded-full">
                                      ({nGrupos} grupos repartibles de {comp.horas_requeridas / nGrupos}h)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {comp.asignaciones.map((asig: any) => (
                                  <div key={asig.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border rounded-xl text-xs">
                                    <span className="font-bold">{asig.docente.apellidos} ({asig.horas_asignadas}h)</span>
                                    <button onClick={() => abrirModalAsignacion(comp, asig)} className="text-slate-400 hover:text-blue-500"><Edit2 className="w-3 h-3"/></button>
                                    <button onClick={() => manejarEliminarAsignacion(asig.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                  </div>
                                ))}
                                {faltan > 0 && <span className="text-xs text-red-500">Faltan {faltan}h</span>}
                              </div>
                            </div>
                            <Boton size="sm" variant="outline" onClick={() => abrirModalAsignacion(comp)} className="rounded-xl">
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Asignar
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

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-unt-primary" /> Carga Docente
            </h2>
            {resumenCarga?.map((docente: any) => {
              const total = docente.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
              return (
                <div key={docente.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <p className="font-bold text-sm">{docente.apellidos}, {docente.nombres}</p>
                  <p className="text-xs text-slate-500">{total} / {docente.horas_max_semana || 40}h</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={modalAsignacion} onClose={() => setModalAsignacion(false)} titulo="Asignación de Carga">
        <div className="space-y-6">
          <Selector label="Docente" value={idDocente} onChange={(e: any) => setIdDocente(Number(e.target.value))}>
            <option value={0}>-- Elegir docente --</option>
            {docentes.map((d: any) => (
              <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres}</option>
            ))}
          </Selector>
          <CampoTexto label="Horas" type="number" value={horasAsignadas} onChange={(e) => setHorasAsignadas(Number(e.target.value))} />
          <Boton onClick={manejarAsignar} cargando={mutationAsignar.isPending} className="w-full">
            {asignacionEditando ? 'Actualizar' : 'Asignar'}
          </Boton>
        </div>
      </Modal>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
