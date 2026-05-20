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
import { VistaHorarioDocente } from '@/components/horarios/VistaHorarioDocente';
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

  const { data: matriz, actualizarMatriz } = useDisponibilidad(ambienteId, idPeriodo);

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

  const manejarClickCelda = async (dia: string, hora: string, estado: string) => {
    if (!docenteId) {
      setMensaje({ texto: 'No se pudo identificar el docente autenticado.', tipo: 'error' });
      return;
    }

    if (!componenteSeleccionado) {
      setMensaje({ texto: 'Selecciona primero un componente del curso.', tipo: 'error' });
      return;
    }

    if (!grupoSeleccionado) {
      setMensaje({ texto: 'Selecciona primero un grupo para el componente.', tipo: 'error' });
      return;
    }

    if (estado === 'LIBRE') {
      if (!ambienteId) {
        setMensaje({ texto: 'Selecciona un ambiente antes de elegir una celda.', tipo: 'error' });
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
        setMensaje({ texto: 'Celda seleccionada correctamente.', tipo: 'success' });
      } catch (err: any) {
        setMensaje({ texto: err.response?.data?.error || 'Error al seleccionar la celda.', tipo: 'error' });
      }
    }
  };

  const quitarCeldaVistaPrevia = async (seleccion: any) => {
    try {
      await deseleccionarCelda({
        idDocente: docenteId,
        idAmbiente: seleccion.idAmbiente,
        diaSemana: seleccion.diaSemana,
        horaInicio: seleccion.horaInicio,
        sesionId: seleccion.sesionId,
      });
      actualizarMatriz();
      queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
      setMensaje({ texto: 'Celda liberada correctamente.', tipo: 'success' });
    } catch (err: any) {
      setMensaje({ texto: err.response?.data?.error || 'No se pudo liberar la celda.', tipo: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Selección de Horarios</h1>

      {/* Selección de ambiente */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Selector
            label="Ambiente"
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
        <div className="flex-1">
          <Selector
            label="Grupo"
            opciones={[
              { valor: '', etiqueta: componenteSeleccionado ? 'Seleccionar grupo' : 'Selecciona un componente' },
              ...((gruposDisponibles || []).map((g: any) => ({
                valor: String(g.id),
                etiqueta: `G${g.codigo} (Cap: ${g.capacidad_maxima})`,
              })) || []),
            ]}
            value={grupoSeleccionado?.toString() || ''}
            onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!componenteSeleccionado || gruposLoading}
          />
        </div>
      </div>

      {/* Panel de curso */}
      <PanelSeleccionCurso
        componentes={progreso || []}
        componenteSeleccionado={componenteSeleccionado}
        alCambiarComponente={(id) => setComponenteSeleccionado(id || null)}
      />

      {/* Matriz de disponibilidad */}
      <MatrizDisponibilidad matriz={matriz || null} alHacerClickCelda={manejarClickCelda} />

      {/* Progreso y validaciones */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Progreso</h2>
          <IndicadorProgresoHoras progreso={progreso || []} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Validaciones</h2>
          <PanelValidaciones validacion={validacion || null} />
        </div>
      </div>

      {/* Vista previa horario */}
      <div>
        <h2 className="font-semibold mb-2">Mi Horario Actual</h2>
        <VistaHorarioDocente selecciones={selecciones} alQuitarCelda={quitarCeldaVistaPrevia} />
      </div>

      {!!docenteId && !!idPeriodo && (
        <ConfirmacionHorario
          docenteId={docenteId}
          idPeriodo={idPeriodo}
          alConfirmar={() => {
            queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
            queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
            queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
            actualizarMatriz();
          }}
        />
      )}

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
