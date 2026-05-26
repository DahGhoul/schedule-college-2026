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
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-700">
        
        {/* PANEL IZQUIERDO: CONFIGURACIÓN (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Tarjeta: Selección de Docente */}
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-6 overflow-visible">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Docente</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Identificación</p>
              </div>
            </div>

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

          {!docenteId ? (
            <div className="bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold text-sm">Seleccione un docente para cargar su carga académica.</p>
            </div>
          ) : (
            <>
              {/* Tarjeta: Curso y Ambiente */}
              <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight">Curso y Ambiente</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Configuración de Asignación</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-2">
                    <div className="p-1 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <PanelSeleccionCurso
                        componentes={progreso || []}
                        componenteSeleccionado={componenteSeleccionado}
                        alCambiarComponente={(id) => setComponenteSeleccionado(id || null)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <Selector
                        label="Ambiente (Aula/Lab)"
                        opciones={[
                          { valor: '', etiqueta: 'Seleccionar ambiente' },
                          ...ambientesFiltrados.map((a: any) => ({
                            valor: String(a.id),
                            etiqueta: `${a.codigo} (${a.tipo === 'AULA' ? 'Aula' : 'Laboratorio'}, Cap: ${a.capacidad})`,
                          })),
                        ]}
                        value={ambienteId?.toString() || ''}
                        onChange={(e) => setAmbienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="rounded-2xl border-slate-200"
                      />

                      <Selector
                        label="Grupo Académico"
                        opciones={[
                          { valor: '', etiqueta: 'Seleccionar grupo' },
                          ...((gruposDisponibles || []).map((g: any) => ({
                            valor: String(g.id),
                            etiqueta: `G${g.codigo} (Aforo: ${g.capacidad_maxima})`,
                          })) || []),
                        ]}
                        value={grupoSeleccionado?.toString() || ''}
                        onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value, 10) : null)}
                        disabled={!componenteSeleccionado || gruposLoading}
                        className="rounded-2xl border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Progreso y Validaciones */}
              <div className="bg-[#0b1f3a] rounded-[3rem] shadow-2xl p-8 text-white space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Progreso y Reglas</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Validación en tiempo real</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Horas Asignadas
                    </h3>
                    <IndicadorProgresoHoras progreso={progreso || []} dark />
                  </div>

                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> Estado de Reglas
                    </h3>
                    <PanelValidaciones validacion={validacion || null} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* PANEL DERECHO: MATRIZ Y HORARIO (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Matriz de Disponibilidad */}
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Matriz de Horarios</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {ambienteId ? `Ambiente: ${matriz?.ambienteCodigo || 'Cargando...'}` : 'Seleccione un ambiente para comenzar'}
                  </p>
                </div>
              </div>
              {ambienteId && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado
                </div>
              )}
            </div>

            <div className="min-h-[500px]">
              <MatrizDisponibilidad matriz={matriz || null} alHacerClickCelda={manejarClickCelda} />
            </div>
          </div>

          {/* Horario Actual y Confirmación */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-8 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Horario del Docente</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Vista Previa de Carga</p>
                </div>
              </div>
              <VistaHorarioDocente selecciones={selecciones} alQuitarCelda={quitarCeldaVistaPrevia} />
            </div>

            {docenteId && (
              <div className="bg-gradient-to-r from-[#0b1f3a] to-[#123b6d] rounded-[3rem] shadow-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">Confirmar Registro</h3>
                  <p className="text-white/60 text-sm max-w-md">
                    Al confirmar, todos los bloques temporales se guardarán oficialmente en el periodo académico activo.
                  </p>
                </div>
                <ConfirmacionHorario
                  docenteId={docenteId}
                  idPeriodo={idPeriodo}
                  deshabilitado={validacion ? !validacion.valido : false}
                  alConfirmar={() => {
                    queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
                    queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
                    queryClient.invalidateQueries({ queryKey: ['progreso-secretaria', docenteId] });
                    actualizarMatriz();
                    setMensaje({ texto: '¡Horario registrado con éxito!', tipo: 'success' });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

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
