'use client';
import { useState, useCallback } from 'react';
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
import { Boton } from '@/components/ui/Boton';
import { useQueryClient } from '@tanstack/react-query';

export default function SeleccionHorarioPage() {
  const { usuario } = useAuthStore();
  const queryClient = useQueryClient();
  const docenteId = usuario?.idDocente || 0;

  const [ambienteTeoriaId, setAmbienteTeoriaId] = useState<number | null>(null);
  const [ambienteLabId, setAmbienteLabId] = useState<number | null>(null);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<number | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('TEORIA');
  const [sesionId] = useState(crypto.randomUUID());

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

  const { data: matriz, actualizarMatriz } = useDisponibilidad(
    tipoSeleccionado === 'TEORIA' ? ambienteTeoriaId : ambienteLabId,
    idPeriodo
  );

  const { selecciones, seleccionarCelda, deseleccionarCelda } = useSeleccionHorario(docenteId);

  const { data: validacion } = useValidacionTiempoReal(docenteId, idPeriodo);

  // WebSocket para actualizar matriz en tiempo real
  const manejarMensajeWS = useCallback((data: any) => {
    if (data.tipo === 'celda_seleccionada' || data.tipo === 'celda_deseleccionada') {
      actualizarMatriz();
    }
  }, [actualizarMatriz]);
  useWebSocket(manejarMensajeWS);

  const manejarClickCelda = async (dia: string, hora: string, estado: string) => {
    if (!cursoSeleccionado || !docenteId) return;

    if (estado === 'LIBRE') {
      const ambienteId = tipoSeleccionado === 'TEORIA' ? ambienteTeoriaId : ambienteLabId;
      if (!ambienteId) return;
      const horaFin = `${(parseInt(hora) + 1).toString().padStart(2, '0')}:00`;
      try {
        await seleccionarCelda({
          idDocente: docenteId,
          idCurso: cursoSeleccionado,
          idAmbiente: ambienteId,
          tipoClase: tipoSeleccionado,
          diaSemana: dia,
          horaInicio: hora,
          horaFin,
          sesionId,
        });
        actualizarMatriz();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al seleccionar');
      }
    }
  };

  const quitarCeldaVistaPrevia = async (dia: string, hora: string) => {
    const ambienteId = tipoSeleccionado === 'TEORIA' ? ambienteTeoriaId : ambienteLabId;
    if (!ambienteId) return;
    await deseleccionarCelda({
      idDocente: docenteId,
      idAmbiente: ambienteId,
      diaSemana: dia,
      horaInicio: hora,
      sesionId,
    });
    actualizarMatriz();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Selección de Horarios</h1>

      {/* Selección de ambiente */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Selector
            label="Ambiente para Teoría"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar aula' },
              ...(ambientes
                ?.filter((a: any) => a.tipo === 'AULA' && a.activo)
                .map((a: any) => ({ valor: String(a.id), etiqueta: `${a.codigo} (Cap: ${a.capacidad})` })) ||
                []),
            ]}
            value={ambienteTeoriaId?.toString() || ''}
            onChange={(e) => setAmbienteTeoriaId(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
        <div className="flex-1">
          <Selector
            label="Ambiente para Laboratorio"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar laboratorio' },
              ...(ambientes
                ?.filter((a: any) => a.tipo === 'LABORATORIO' && a.activo)
                .map((a: any) => ({ valor: String(a.id), etiqueta: `${a.codigo} (Cap: ${a.capacidad})` })) ||
                []),
            ]}
            value={ambienteLabId?.toString() || ''}
            onChange={(e) => setAmbienteLabId(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Panel de curso */}
      <PanelSeleccionCurso
        cursos={progreso || []}
        cursoSeleccionado={cursoSeleccionado}
        tipoSeleccionado={tipoSeleccionado}
        alCambiarCurso={setCursoSeleccionado}
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
    </div>
  );
}