'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { horariosService } from '@/services/horarios.service';
import { periodosService } from '@/services/periodos.service';
import { Selector } from '@/components/ui/Selector';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;
const HORAS = Array.from({ length: 14 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`);

export default function VistaHorarioDocentePage() {
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  const { data: disponibilidadDocente } = useQuery({
    queryKey: ['docente-disponibilidad', docenteSeleccionado],
    queryFn: () => docentesService.obtenerDisponibilidad(docenteSeleccionado as number).then((res) => res.data),
    enabled: !!docenteSeleccionado,
  });

  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios', 'docente', docenteSeleccionado, periodoActivo?.id],
    queryFn: () =>
      horariosService
        .listarHorarios({ idDocente: docenteSeleccionado, idPeriodo: periodoActivo?.id })
        .then((res) => res.data),
    enabled: !!docenteSeleccionado && !!periodoActivo,
  });

  useEffect(() => {
    const siguiente: Record<string, boolean> = {};
    for (const dia of DIAS) {
      for (const hora of HORAS) {
        siguiente[`${dia}|${hora}`] = false;
      }
    }

    for (const slot of disponibilidadDocente || []) {
      siguiente[`${slot.dia_semana}|${slot.hora_inicio}`] = !!slot.disponible;
    }

    setDisponibilidad(siguiente);
  }, [disponibilidadDocente, docenteSeleccionado]);

  const guardarDisponibilidad = async () => {
    if (!docenteSeleccionado) return;
    setGuardando(true);
    try {
      const payload = Object.entries(disponibilidad).map(([clave, disponible]) => {
        const [diaSemana, horaInicio] = clave.split('|');
        const horaFin = `${String(parseInt(horaInicio.slice(0, 2), 10) + 1).padStart(2, '0')}:00`;
        return { diaSemana, horaInicio, horaFin, disponible };
      });
      await docentesService.guardarDisponibilidad(docenteSeleccionado, payload);
      setMensaje({ mensaje: 'Disponibilidad guardada', tipo: 'exito' });
    } catch (error: any) {
      setMensaje({ mensaje: error.response?.data?.error || 'No se pudo guardar la disponibilidad', tipo: 'error' });
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(null), 5000);
    }
  };

  const alternarSlot = (dia: string, hora: string) => {
    setDisponibilidad((actual) => ({
      ...actual,
      [`${dia}|${hora}`]: !actual[`${dia}|${hora}`],
    }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Horario por Docente</h1>
      {mensaje && <NotificacionToast mensaje={mensaje.mensaje} tipo={mensaje.tipo} />}
      <div className="mb-4">
        <Selector
          label="Seleccionar Docente"
          opciones={[
            { valor: '', etiqueta: 'Seleccionar...' },
            ...(docentes?.map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })) || []),
          ]}
          value={docenteSeleccionado?.toString() || ''}
          onChange={(e) => setDocenteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
        />
      </div>
      {isLoading ? (
        <SpinnerCarga />
      ) : docenteSeleccionado && periodoActivo ? (
        <div className="space-y-6">
          <CalendarioGeneral idPeriodo={periodoActivo.id} filtroTipo="DOCENTE" filtroId={docenteSeleccionado} modo="LECTURA" />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Disponibilidad del docente</h2>
                <p className="text-sm text-gray-500">Activa los bloques en los que este docente puede recibir clases.</p>
              </div>
              <Boton onClick={guardarDisponibilidad} disabled={guardando} className="bg-sky-600 hover:bg-sky-700">
                {guardando ? 'Guardando...' : 'Guardar disponibilidad'}
              </Boton>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 py-2 pr-2">Hora</th>
                    {DIAS.map((dia) => (
                      <th key={dia} className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 py-2">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map((hora) => (
                    <tr key={hora}>
                      <td className="text-sm font-medium text-gray-700 pr-2 whitespace-nowrap">{hora}</td>
                      {DIAS.map((dia) => {
                        const activa = disponibilidad[`${dia}|${hora}`];
                        return (
                          <td key={`${dia}-${hora}`}>
                            <button
                              type="button"
                              onClick={() => alternarSlot(dia, hora)}
                              className={`w-full min-w-[74px] rounded-xl px-3 py-3 text-xs font-semibold transition-colors ${
                                activa
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200'
                              }`}
                            >
                              {activa ? 'Libre' : 'Ocupado'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          Seleccione un docente para ver su horario.
        </p>
      )}
    </div>
  );
}