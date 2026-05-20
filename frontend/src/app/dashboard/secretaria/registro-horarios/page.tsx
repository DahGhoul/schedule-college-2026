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

export default function RegistroManualHorariosPage() {
  const queryClient = useQueryClient();
  const [docenteId, setDocenteId] = useState<number | null>(null);
  const [ambienteId, setAmbienteId] = useState<number | null>(null);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<number | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [sesionId] = useState(crypto.randomUUID());

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

  const { data: matriz, actualizarMatriz } = useDisponibilidad(ambienteId, idPeriodo, docenteId);

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
    const primerGrupo = (gruposDisponibles || [])[0];
    setGrupoSeleccionado(primerGrupo?.id ?? null);
  }, [componenteSeleccionado, gruposDisponibles]);

  const manejarMensajeWS = useCallback((data: any) => {
    if (data.tipo === 'celda_seleccionada' || data.tipo === 'celda_deseleccionada') {
      actualizarMatriz();
    }
  }, [actualizarMatriz]);
  useWebSocket(manejarMensajeWS);

  const manejarClickCelda = async (dia: string, hora: string, estado: string) => {
    if (!docenteId) return;
    if (estado === 'LIBRE') {
      if (!componenteSeleccionado || !grupoSeleccionado) return;
      if (!ambienteId) return;
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
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al seleccionar');
      }
    } else if (estado === 'SELECCION_TEMPORAL') {
      try {
        await deseleccionarCelda({
          idDocente: docenteId,
          idAmbiente: ambienteId || undefined,
          diaSemana: dia,
          horaInicio: hora,
        });
        actualizarMatriz();
        queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
        queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
        queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al liberar celda');
      }
    }
  };

  const quitarCeldaVistaPrevia = async (seleccion: any) => {
    await deseleccionarCelda({
      idDocente: docenteId,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registro manual de horarios</h1>
        <p className="text-sm text-gray-500">Registra horarios cuando un docente no puede ingresar al sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Selector
          label="Seleccionar docente"
          opciones={[
            { valor: '', etiqueta: docentesLoading ? 'Cargando docentes...' : 'Seleccionar docente' },
            ...(docentes || []).map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })),
          ]}
          value={docenteId?.toString() || ''}
          onChange={(e) => {
            const valor = e.target.value ? parseInt(e.target.value, 10) : null;
            setDocenteId(valor);
            setComponenteSeleccionado(null);
            setGrupoSeleccionado(null);
            setAmbienteId(null);
          }}
        />
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
          onChange={(e) => setAmbienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={!docenteId}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={!componenteSeleccionado || gruposLoading}
        />
      </div>

      <PanelSeleccionCurso
        componentes={progreso || []}
        componenteSeleccionado={componenteSeleccionado}
        alCambiarComponente={(id) => setComponenteSeleccionado(id || null)}
      />

      {docenteId && ambienteId && (
        <MatrizDisponibilidad matriz={matriz || null} alHacerClickCelda={manejarClickCelda} />
      )}

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

      <div>
        <h2 className="font-semibold mb-2">Horario actual</h2>
        <VistaHorarioDocente selecciones={selecciones} alQuitarCelda={quitarCeldaVistaPrevia} />
      </div>

      {!!docenteId && !!idPeriodo && (
        <ConfirmacionHorario
          docenteId={docenteId}
          idPeriodo={idPeriodo}
          alConfirmar={() => {
            queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
            queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
            actualizarMatriz();
          }}
        />
      )}
    </div>
  );
}
