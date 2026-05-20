'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useDisponibilidad } from '@/hooks/useDisponibilidad';
import { useSeleccionHorario } from '@/hooks/useSeleccionHorario';
import { useValidacionTiempoReal } from '@/hooks/useValidacionTiempoReal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { periodosService } from '@/services/periodos.service';
import { ambientesService } from '@/services/ambientes.service';
import { horariosService } from '@/services/horarios.service';
import { MatrizDisponibilidad } from '@/components/horarios/MatrizDisponibilidad';
import { PanelSeleccionCurso } from '@/components/horarios/PanelSeleccionCurso';
import { IndicadorProgresoHoras } from '@/components/horarios/IndicadorProgresoHoras';
import { PanelValidaciones } from '@/components/horarios/PanelValidaciones';

import { Selector } from '@/components/ui/Selector';
import { useQueryClient } from '@tanstack/react-query';
import { gruposService } from '@/services/grupos.service';
import { ConfirmacionHorario } from '@/components/horarios/ConfirmacionHorario';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function SeleccionHorarioPage() {
  const { usuario } = useAuthStore();
  const queryClient = useQueryClient();
  const docenteId = usuario?.idDocente || 0;

  const [ambienteId, setAmbienteId] = useState<number | null>(null);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<number | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [sesionId] = useState(crypto.randomUUID());
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);
  const [initialPreselectDone, setInitialPreselectDone] = useState(false);

  // Persistence across navigation transitions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAmbiente = localStorage.getItem('seleccion_ambienteId');
      const savedComp = localStorage.getItem('seleccion_componenteSeleccionado');
      const savedGrupo = localStorage.getItem('seleccion_grupoSeleccionado');
      if (savedAmbiente) setAmbienteId(parseInt(savedAmbiente));
      if (savedComp) setComponenteSeleccionado(parseInt(savedComp));
      if (savedGrupo) setGrupoSeleccionado(parseInt(savedGrupo));
    }
  }, []);

  useEffect(() => {
    if (ambienteId !== null) {
      localStorage.setItem('seleccion_ambienteId', ambienteId.toString());
    } else {
      localStorage.removeItem('seleccion_ambienteId');
    }
  }, [ambienteId]);

  useEffect(() => {
    if (componenteSeleccionado !== null) {
      localStorage.setItem('seleccion_componenteSeleccionado', componenteSeleccionado.toString());
    } else {
      localStorage.removeItem('seleccion_componenteSeleccionado');
    }
  }, [componenteSeleccionado]);

  useEffect(() => {
    if (grupoSeleccionado !== null) {
      localStorage.setItem('seleccion_grupoSeleccionado', grupoSeleccionado.toString());
    } else {
      localStorage.removeItem('seleccion_grupoSeleccionado');
    }
  }, [grupoSeleccionado]);

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const idPeriodo = periodoActivo?.id || 0;

  const { data: ambientes } = useQuery({
    queryKey: ['ambientes'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const { data: progreso } = useQuery({
    queryKey: ['progreso', docenteId],
    queryFn: () => horariosService.obtenerProgreso(docenteId).then((res) => res.data),
    enabled: !!docenteId,
  });

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

  // Pre-selección inicial del primer ambiente disponible si no hay guardado en localStorage
  useEffect(() => {
    if (!initialPreselectDone && ambientesFiltrados && ambientesFiltrados.length > 0) {
      setInitialPreselectDone(true);
      const saved = localStorage.getItem('seleccion_ambienteId');
      if (!saved) {
        setAmbienteId(ambientesFiltrados[0].id);
      }
    }
  }, [ambientesFiltrados, initialPreselectDone]);

  // Si el ambiente seleccionado no es compatible con el componente elegido, auto-seleccionar uno compatible
  useEffect(() => {
    if (ambienteId && ambientesFiltrados && ambientesFiltrados.length > 0) {
      const existe = ambientesFiltrados.some((a: any) => a.id === ambienteId);
      if (!existe) {
        setAmbienteId(ambientesFiltrados[0].id);
      }
    }
  }, [ambientesFiltrados, ambienteId]);

  const { data: matriz, actualizarMatriz } = useDisponibilidad(ambienteId, idPeriodo, docenteId);

  const { selecciones, seleccionarCelda, deseleccionarCelda } = useSeleccionHorario(docenteId);

  const { data: validacion } = useValidacionTiempoReal(docenteId, idPeriodo);

  const { data: gruposDisponibles, isLoading: gruposLoading } = useQuery({
    queryKey: ['grupos-por-componente', componenteSeleccionado],
    queryFn: () => gruposService.listarPorComponente(componenteSeleccionado as number).then((res) => res.data),
    enabled: !!componenteSeleccionado,
  });

  useEffect(() => {
    if (!componenteSeleccionado) {
      setGrupoSeleccionado(null);
      return;
    }
    const primerGrupo = (gruposDisponibles || [])[0];
    setGrupoSeleccionado(primerGrupo?.id ?? null);
  }, [componenteSeleccionado, gruposDisponibles]);

  // WebSocket para actualizar matriz en tiempo real
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
      setMensaje({ texto: 'No se pudo identificar el docente autenticado.', tipo: 'error' });
      return;
    }

    if (estado === 'LIBRE') {
      if (!componenteSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un componente del curso.', tipo: 'error' });
        return;
      }

      if (!grupoSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un grupo para el componente.', tipo: 'error' });
        return;
      }

      if (!ambienteId) {
        setMensaje({ texto: 'Selecciona un ambiente antes de elegir una celda.', tipo: 'error' });
        return;
      }

      // Validar si ya se alcanzaron o excedieron las horas requeridas
      const registroProgreso = (progreso || []).find((p: any) => p.idComponente === componenteSeleccionado);
      if (registroProgreso && registroProgreso.horasAsignadas >= registroProgreso.horasRequeridas) {
        setMensaje({
          texto: `No puedes seleccionar más horas para ${registroProgreso.nombreCurso} (${registroProgreso.tipoComponente}). Límite alcanzado: ${registroProgreso.horasRequeridas}h.`,
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
        setMensaje({ texto: 'Celda seleccionada correctamente.', tipo: 'success' });
      } catch (err: any) {
        setMensaje({ texto: err.response?.data?.error || 'Error al seleccionar la celda.', tipo: 'error' });
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
        setMensaje({ texto: 'Celda liberada correctamente.', tipo: 'success' });
      } catch (err: any) {
        setMensaje({ texto: err.response?.data?.error || 'No se pudo liberar la celda.', tipo: 'error' });
      }
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-2 animate-fadeIn">
      {/* Header section with premium look */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-unt-primary text-white shadow-md">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            Elegir mi Horario
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Gestiona la asignación de tus cursos en los ambientes disponibles para el período académico activo.
          </p>
        </div>
        {periodoActivo && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Periodo Activo: {periodoActivo.nombre}
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Courses and settings (1/3 width on desktop) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card: Course selection & groups */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-700 border-b border-gray-100 pb-3 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-unt-primary"></span>
              Cursos Asignados
            </h2>
            
            <PanelSeleccionCurso
              componentes={progreso || []}
              componenteSeleccionado={componenteSeleccionado}
              alCambiarComponente={(id) => setComponenteSeleccionado(id || null)}
            />

            {/* Selector de ambiente siempre visible para no obligar a seleccionar un componente primero */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
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
                onChange={(e) => setAmbienteId(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            {componenteSeleccionado && (
              <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
                <h3 className="text-sm font-semibold text-slate-600">Configuración de Grupo Académico</h3>
                
                <div className="space-y-4">
                  <Selector
                    label="Grupo Académico"
                    opciones={[
                      { valor: '', etiqueta: 'Seleccionar grupo' },
                      ...((gruposDisponibles || []).map((g: any) => ({
                        valor: String(g.id),
                        etiqueta: `Grupo ${g.codigo} (Cap: ${g.capacidad_maxima})`,
                      })) || []),
                    ]}
                    value={grupoSeleccionado?.toString() || ''}
                    onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={gruposLoading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: Progress */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-700 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-indigo-500"></span>
              Avance de Horas
            </h2>
            <IndicadorProgresoHoras progreso={progreso || []} />
          </div>

          {/* Card: Validations */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-700 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-rose-500"></span>
              Validaciones de Reglas
            </h2>
            <PanelValidaciones validacion={validacion || null} />
          </div>
        </div>

        {/* Right column: Availability Matrix and Confirmation (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Matrix Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-emerald-500"></span>
                Horarios en Ambiente
              </h2>
              {ambienteId && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Verificando Disponibilidad
                </span>
              )}
            </div>
            <MatrizDisponibilidad matriz={matriz || null} alHacerClickCelda={manejarClickCelda} />
          </div>

          {/* Confirmation Box */}
          {!!docenteId && !!idPeriodo && (
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-between gap-4 md:flex-row shadow-sm">
              <div className="text-center md:text-left">
                <h3 className="font-bold text-slate-700 text-base">¿Listo con tus selecciones?</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Confirma tus selecciones temporales. Al confirmar, tus bloques se guardarán en la base de datos como Borrador Oficial.
                </p>
              </div>
              <ConfirmacionHorario
                docenteId={docenteId}
                idPeriodo={idPeriodo}
                deshabilitado={validacion ? !validacion.valido : false}
                alConfirmar={() => {
                  queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
                  queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
                  queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
                  queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
                  actualizarMatriz();
                  setMensaje({ texto: '¡Horario confirmado correctamente en la base de datos!', tipo: 'success' });
                }}
              />
            </div>
          )}
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
