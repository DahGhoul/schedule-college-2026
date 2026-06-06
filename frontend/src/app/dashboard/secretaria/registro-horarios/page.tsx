'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDisponibilidad } from '@/hooks/useDisponibilidad';
import { useSeleccionHorario } from '@/hooks/useSeleccionHorario';
import { useValidacionTiempoReal } from '@/hooks/useValidacionTiempoReal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { periodosService } from '@/services/periodos.service';
import { ambientesService } from '@/services/ambientes.service';
import { docentesService } from '@/services/docentes.service';
import { configuracionService } from '@/services/configuracion.service';
import { horariosService } from '@/services/horarios.service';
import { gruposService } from '@/services/grupos.service';
import { MatrizDisponibilidad } from '@/components/horarios/MatrizDisponibilidad';
import { PanelSeleccionCurso } from '@/components/horarios/PanelSeleccionCurso';
import { IndicadorProgresoHoras } from '@/components/horarios/IndicadorProgresoHoras';
import { PanelValidaciones } from '@/components/horarios/PanelValidaciones';
import { VistaHorarioDocente } from '@/components/horarios/VistaHorarioDocente';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { ConfirmacionHorario } from '@/components/horarios/ConfirmacionHorario';
import { 
  CheckSquare, 
  User, 
  School, 
  BookOpen, 
  Users, 
  Clock, 
  ShieldCheck, 
  Calendar,
  LayoutDashboard,
  Search,
  ArrowRight,
  Activity
} from 'lucide-react';
import { SelectorFiltrable } from '@/components/ui/SelectorFiltrable';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function RegistroManualHorariosPage() {
  const queryClient = useQueryClient();
  const [docenteId, setDocenteId] = useState<number | null>(null);
  const [ambienteId, setAmbienteId] = useState<number | null>(null);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<number | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [sesionId] = useState(crypto.randomUUID());
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);

  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo-secretaria'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const idPeriodo = periodoActivo?.id || 0;

  const { data: docentes, isLoading: docentesLoading } = useQuery({
    queryKey: ['docentes-secretaria'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  const { data: ambientes } = useQuery({
    queryKey: ['ambientes-secretaria'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const { data: restricciones } = useQuery({
    queryKey: ['restricciones'],
    queryFn: () => configuracionService.obtenerRestricciones().then((res) => res.data),
  });

  const { data: progreso } = useQuery({
    queryKey: ['progreso-secretaria', docenteId],
    queryFn: () => horariosService.obtenerProgreso(docenteId as number).then((res) => res.data),
    enabled: !!docenteId,
  });

  // Pre-seleccionar componente si hay progreso
  useEffect(() => {
    if (progreso && progreso.length > 0 && componenteSeleccionado === null) {
      const pendiente = progreso.find((p: any) => p.horasAsignadas < p.horasRequeridas) || progreso[0];
      if (pendiente) {
        setComponenteSeleccionado(pendiente.idComponente);
      }
    }
  }, [progreso, componenteSeleccionado]);

  const tipoComponenteSeleccionado = useMemo(() => {
    const registro = (progreso || []).find((p: any) => p.idComponente === componenteSeleccionado);
    return (registro?.tipoComponente || '').toUpperCase();
  }, [progreso, componenteSeleccionado]);

  const ambientesFiltrados = useMemo(() => {
    const lista = (ambientes || []).filter((a: any) => a.activo);
    if (!tipoComponenteSeleccionado) return lista;
    if (tipoComponenteSeleccionado === 'LABORATORIO') return lista.filter((a: any) => a.tipo === 'LABORATORIO');
    if (tipoComponenteSeleccionado === 'PRACTICA') return lista.filter((a: any) => a.tipo === 'AULA' || a.tipo === 'LABORATORIO');
    return lista.filter((a: any) => a.tipo === 'AULA');
  }, [ambientes, tipoComponenteSeleccionado]);

  // Si el ambiente seleccionado no es compatible, resetearlo o elegir uno compatible
  useEffect(() => {
    if (ambienteId && ambientesFiltrados.length > 0) {
      const existe = ambientesFiltrados.some((a: any) => a.id === ambienteId);
      if (!existe) {
        setAmbienteId(ambientesFiltrados[0].id);
      }
    } else if (!ambienteId && ambientesFiltrados.length > 0 && docenteId) {
      setAmbienteId(ambientesFiltrados[0].id);
    }
  }, [ambientesFiltrados, ambienteId, docenteId]);

  const { data: matriz, actualizarMatriz } = useDisponibilidad(ambienteId, idPeriodo, docenteId, componenteSeleccionado);

  const { selecciones, seleccionarCelda, deseleccionarCelda } = useSeleccionHorario(docenteId || 0);

  const { data: validacion } = useValidacionTiempoReal(docenteId || 0, idPeriodo);

  const { data: gruposDisponibles, isLoading: gruposLoading } = useQuery({
    queryKey: ['grupos-por-componente-secretaria', componenteSeleccionado],
    queryFn: () => gruposService.listarPorComponente(componenteSeleccionado as number).then((res) => res.data),
    enabled: !!componenteSeleccionado,
  });

  useEffect(() => {
    if (!componenteSeleccionado) {
      setGrupoSeleccionado(null);
      return;
    }
    if (gruposDisponibles && gruposDisponibles.length > 0) {
      const primerGrupo = gruposDisponibles[0];
      setGrupoSeleccionado(primerGrupo?.id ?? null);
    }
  }, [componenteSeleccionado, gruposDisponibles]);

  const manejarMensajeWS = useCallback((data: any) => {
    if (data.tipo === 'celda_seleccionada' || data.tipo === 'celda_deseleccionada') {
      actualizarMatriz();
      queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
      queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
    }
  }, [actualizarMatriz, queryClient, docenteId, idPeriodo]);
  useWebSocket(manejarMensajeWS);

  const manejarClickCelda = async (dia: string, hora: string, estado: string, info?: any) => {
    if (!docenteId) {
      setMensaje({ texto: 'Por favor, seleccione un docente primero.', tipo: 'error' });
      return;
    }

    if (estado === 'BLOQUEO_INSTITUCIONAL') {
      setMensaje({ texto: 'Ese horario está bloqueado por la franja de almuerzo configurada.', tipo: 'error' });
      return;
    }

    if (estado === 'LIBRE') {
      if (!componenteSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un componente del curso.', tipo: 'error' });
        return;
      }
      if (!grupoSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un grupo.', tipo: 'error' });
        return;
      }
      if (!ambienteId) {
        setMensaje({ texto: 'Selecciona un ambiente.', tipo: 'error' });
        return;
      }

      // Validar si ya se alcanzaron las horas requeridas
      const registroProgreso = (progreso || []).find((p: any) => p.idComponente === componenteSeleccionado);
      if (registroProgreso && registroProgreso.horasAsignadas >= registroProgreso.horasRequeridas) {
        setMensaje({
          texto: `Límite de horas alcanzado para ${registroProgreso.nombreCurso}.`,
          tipo: 'error',
        });
        return;
      }

      const horaFin = `${(parseInt(hora) + 1).toString().padStart(2, '0')}:00`;
      try {
        await seleccionarCelda({
          idDocente: docenteId,
          idComponente: componenteSeleccionado,
          idGrupo: grupoSeleccionado,
          idAmbiente: ambienteId,
          diaSemana: dia,
          horaInicio: hora,
          horaFin,
          sesionId,
        });
        actualizarMatriz();
        queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
        queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
        queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
        setMensaje({ texto: 'Celda asignada temporalmente.', tipo: 'success' });
      } catch (err: any) {
        setMensaje({ texto: err.response?.data?.error || 'Error al seleccionar', tipo: 'error' });
      }
    } else if (estado === 'SELECCION_TEMPORAL' || estado === 'DOCENTE_OTRO_AMBIENTE') {
      try {
        await deseleccionarCelda({
          idDocente: docenteId,
          idAmbiente: info?.idAmbiente || ambienteId || undefined,
          diaSemana: dia,
          horaInicio: hora,
          sesionId: info?.sesionId || sesionId,
        });
        actualizarMatriz();
        queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
        queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
        queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
        setMensaje({ texto: 'Celda liberada.', tipo: 'success' });
      } catch (err: any) {
        setMensaje({ texto: err.response?.data?.error || 'Error al liberar celda', tipo: 'error' });
      }
    }
  };

  const quitarCeldaVistaPrevia = async (seleccion: any) => {
    await deseleccionarCelda({
      idDocente: docenteId!,
      idAmbiente: seleccion.idAmbiente,
      diaSemana: seleccion.diaSemana,
      horaInicio: seleccion.horaInicio,
      sesionId: seleccion.sesionId,
    });
    actualizarMatriz();
    queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
    queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
    queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
  };

  if (periodoLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20 px-4">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <CheckSquare className="w-3.5 h-3.5" />
              Asistencia Administrativa
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Registro Manual de Horarios</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Asigna horarios de forma directa para docentes que presentan dificultades técnicas o falta de acceso.
            </p>
          </div>
          
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-inner">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 ml-1">Periodo Académico Activo</p>
            <div className="flex items-center gap-4 bg-white/20 p-4 rounded-2xl border border-white/10">
              <div className="p-3 bg-white/20 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{periodoActivo?.nombre || 'No identificado'}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase">Esc. Ing. Sistemas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-700 space-y-10">
        
        {/* FILA SUPERIOR: SELECTORES Y CONFIGURACIÓN */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          
          {/* Tarjeta 1: Selección de Docente (3/12) */}
          <div className="xl:col-span-3 bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 p-8 flex flex-col justify-between overflow-visible min-h-[280px]">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Docente</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Identificación</p>
                </div>
              </div>

              <div className="pt-2">
                <SelectorFiltrable
                  label=""
                  value={docenteId || 0}
                  onChange={(val) => {
                    const id = Number(val);
                    setDocenteId(id || null);
                    setComponenteSeleccionado(null);
                    setGrupoSeleccionado(null);
                    setAmbienteId(null);
                  }}
                  opciones={(docentes || []).map((d: any) => ({
                    valor: d.id,
                    etiqueta: `${d.apellidos}, ${d.nombres}`
                  }))}
                  placeholder="Buscar docente..."
                />
              </div>
            </div>
            
            {docenteId && (
              <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs font-bold text-indigo-700">Sesión activa para registro</p>
              </div>
            )}
          </div>

          {/* Tarjeta 2: Curso y Ambiente (5/12) */}
          <div className="xl:col-span-5 bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 p-8 flex flex-col min-h-[280px]">
            {!docenteId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Seleccione un docente primero</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Curso y Ambiente</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configuración</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-11 gap-6 flex-1">
                  <div className="md:col-span-6 space-y-2 flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Componente</p>
                    <div className="flex-1 min-h-[140px] bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="h-full overflow-y-auto custom-scrollbar p-1">
                        <PanelSeleccionCurso
                          componentes={progreso || []}
                          componenteSeleccionado={componenteSeleccionado}
                          alCambiarComponente={(id) => setComponenteSeleccionado(id || null)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ambiente</p>
                      <Selector
                        label=""
                        opciones={[
                          { valor: '', etiqueta: 'Elegir ambiente' },
                          ...ambientesFiltrados.map((a: any) => ({
                            valor: String(a.id),
                            etiqueta: `${a.codigo} (${a.tipo === 'AULA' ? 'Aula' : 'Lab'}, Cap: ${a.capacidad})`,
                          })),
                        ]}
                        value={ambienteId?.toString() || ''}
                        onChange={(e) => setAmbienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grupo</p>
                      <Selector
                        label=""
                        opciones={[
                          { valor: '', etiqueta: 'Elegir grupo' },
                          ...((gruposDisponibles || []).map((g: any) => ({
                            valor: String(g.id),
                            etiqueta: `G${g.codigo} (Cap: ${g.capacidad_maxima})`,
                          })) || []),
                        ]}
                        value={grupoSeleccionado?.toString() || ''}
                        onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value, 10) : null)}
                        disabled={!componenteSeleccionado || gruposLoading}
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta 3: Progreso y Reglas (4/12) */}
          <div className="xl:col-span-4 bg-[#0b1f3a] rounded-[2.5rem] shadow-2xl p-8 text-white flex flex-col min-h-[280px]">
            {!docenteId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-30">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-bold text-sm">Validación en espera</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl shadow-inner">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Estado</h2>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Reglas de Negocio</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Progreso de Horas</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                      <IndicadorProgresoHoras progreso={progreso || []}/>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Alertas y Cruces</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                      <PanelValidaciones validacion={validacion || null} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FILA INFERIOR: MATRIZ Y VISTA PREVIA */}
        <div className="space-y-8">
          
          {/* Matriz de Disponibilidad (Ahora a todo lo ancho) */}
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-10 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-amber-50 rounded-3xl text-amber-600 shadow-sm">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Matriz de Horarios</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {ambienteId ? (
                      <span className="flex items-center gap-2">
                        Ambiente: <span className="text-slate-600 font-black">{matriz?.ambienteCodigo || 'Cargando...'}</span>
                      </span>
                    ) : 'Seleccione un ambiente para visualizar la disponibilidad'}
                  </p>
                </div>
              </div>
              {ambienteId && (
                <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-[1.5rem] border border-emerald-100 text-xs font-black uppercase tracking-widest shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sistema Sincronizado
                </div>
              )}
            </div>

            <div className="min-h-[600px] overflow-x-auto custom-scrollbar pt-4">
              <MatrizDisponibilidad
                matriz={matriz || null}
                alHacerClickCelda={manejarClickCelda}
                bloqueoAlmuerzo={
                  restricciones?.bloqueoAlmuerzoInicio && restricciones?.bloqueoAlmuerzoFin
                    ? { inicio: restricciones.bloqueoAlmuerzoInicio, fin: restricciones.bloqueoAlmuerzoFin }
                    : null
                }
              />
            </div>
          </div>

          {/* Horario del Docente y Confirmación Final */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-10 space-y-8">
              <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 shadow-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Carga Horaria Actual</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Vista Previa Consolidada</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <VistaHorarioDocente selecciones={selecciones} alQuitarCelda={quitarCeldaVistaPrevia} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0b1f3a] to-[#1e3a8a] rounded-[3rem] shadow-2xl p-10 text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
              
              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-white/10 rounded-2xl w-fit">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-black tracking-tight leading-tight">Confirmar Programación</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Verifica que no existan advertencias en el panel de reglas antes de confirmar. Esta acción es irreversible una vez guardada.
                </p>
              </div>

              <div className="pt-8 relative z-10">
                <ConfirmacionHorario
                  docenteId={docenteId || 0}
                  idPeriodo={idPeriodo}
                  deshabilitado={!docenteId || (validacion ? !validacion.valido : false)}
                  alConfirmar={() => {
                    queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
                    queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
                    queryClient.invalidateQueries({ queryKey: ['progreso-secretaria', docenteId] });
                    actualizarMatriz();
                    setMensaje({ texto: '¡Horario registrado con éxito!', tipo: 'success' });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {mensaje && (
        <NotificacionToast 
          mensaje={mensaje.texto} 
          tipo={mensaje.tipo} 
          onClose={() => setMensaje(null)} 
        />
      )}
    </div>
  );
}
