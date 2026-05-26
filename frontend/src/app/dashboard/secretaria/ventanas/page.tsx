'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { periodosService } from '@/services/periodos.service';
import { ventanasService } from '@/services/ventanas.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utilidades';
import { Edit2, Check, Clock, Calendar as CalendarIcon, X, AlertCircle, Trash2 } from 'lucide-react';

const formatearFecha = (fecha?: string | Date) => {
  if (!fecha) return '';
  const f = new Date(fecha);
  // Usamos métodos UTC para evitar desfases de zona horaria en fechas de solo día
  const y = f.getUTCFullYear();
  const m = String(f.getUTCMonth() + 1).padStart(2, '0');
  const d = String(f.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const ESTADO_LABELS: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: 'Pendiente',   cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  EN_PROCESO:  { label: 'En turno',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  COMPLETADO:  { label: 'Completado',  cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
  CANCELADO:   { label: 'Cancelado',   cls: 'bg-rose-50 text-rose-600 border border-rose-200' },
};

function Badge({ estado }: { estado: string }) {
  const conf = ESTADO_LABELS[estado] || { label: estado, cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
  return (
    <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide', conf.cls)}>
      {conf.label}
    </span>
  );
}

function EstadoBadge({ razon }: { razon: string }) {
  const map: Record<string, { icon: string; label: string; cls: string }> = {
    EN_TURNO:            { icon: '🟢', label: 'En turno ahora',      cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    AUN_NO_ES_SU_TURNO:  { icon: '⏰', label: 'Aún no es su turno',  cls: 'bg-amber-50  border-amber-200  text-amber-800' },
    TURNO_VENCIDO:       { icon: '⌛', label: 'Turno vencido',        cls: 'bg-slate-50  border-slate-200  text-slate-600' },
    SIN_ASIGNACION:      { icon: '❓', label: 'Sin asignación',       cls: 'bg-slate-50  border-slate-200  text-slate-500' },
    CANCELADO:           { icon: '✖', label: 'Cancelado',             cls: 'bg-rose-50   border-rose-200   text-rose-700' },
    SIN_RESTRICCION:     { icon: '✓', label: 'Sin restricción',       cls: 'bg-slate-50  border-slate-200  text-slate-600' },
  };
  const c = map[razon] || { icon: '?', label: razon, cls: 'bg-slate-50 border-slate-200 text-slate-500' };
  return (
    <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap', c.cls)}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
}

export default function VentanasSecretariaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [mostrarEdicion, setMostrarEdicion] = useState(false);
  const [turnoAEditar, setTurnoAEditar] = useState<any>(null);
  const [edicionTurno, setEdicionTurno] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
  });

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos-ventanas'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo-ventanas'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  useEffect(() => {
    if (!idPeriodo && periodoActivo?.id) setIdPeriodo(periodoActivo.id);
    if (periodoActivo && !fechaInicio) setFechaInicio(formatearFecha(periodoActivo.fecha_inicio));
    if (periodoActivo && !fechaFin) setFechaFin(formatearFecha(periodoActivo.fecha_fin));
    if (!idPeriodo && !periodoActivo?.id && (periodos || []).length > 0) setIdPeriodo(periodos[0].id);
  }, [idPeriodo, periodoActivo, fechaInicio, fechaFin, periodos]);

  const { data: ventanas, isLoading: ventanasLoading } = useQuery({
    queryKey: ['ventanas-secretaria', idPeriodo],
    queryFn: () => ventanasService.listar(idPeriodo as number).then((res) => res.data),
    enabled: !!idPeriodo,
    refetchInterval: 30_000,
  });

  const actualizarMutation = useMutation({
    mutationFn: () =>
      ventanasService.actualizarHorario({ idPeriodo: idPeriodo as number, fechaInicio, fechaFin, horaInicio, horaFin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas-secretaria', idPeriodo] });
      setToast({ mensaje: 'Horario de atención actualizado', tipo: 'exito' });
      setMostrarEdicion(false);
    },
    onError: (error: any) => setToast({ mensaje: error.response?.data?.error || 'Error al actualizar', tipo: 'error' }),
  });

  const desactivarMutation = useMutation({
    mutationFn: () => ventanasService.desactivar(idPeriodo as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas-secretaria', idPeriodo] });
      setToast({ mensaje: 'Ventanas desactivadas', tipo: 'exito' });
      setMostrarEdicion(false);
    },
    onError: (error: any) => setToast({ mensaje: error.response?.data?.error || 'Error al desactivar', tipo: 'error' }),
  });

  const actualizarTurnoMutation = useMutation({
    mutationFn: () =>
      ventanasService.actualizarTurno({
        idVentana: turnoAEditar.idVentana,
        idDocente: turnoAEditar.idDocente,
        ...edicionTurno,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas-secretaria', idPeriodo] });
      setToast({ mensaje: 'Turno de docente actualizado correctamente', tipo: 'exito' });
      setTurnoAEditar(null);
    },
    onError: (error: any) =>
      setToast({ mensaje: error.response?.data?.error || 'Error al actualizar turno', tipo: 'error' }),
  });

  const desactivarTurnoMutation = useMutation({
    mutationFn: (datos: { idVentana: number; idDocente: number }) =>
      ventanasService.desactivarTurno(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventanas-secretaria', idPeriodo] });
      setToast({ mensaje: 'Turno desactivado correctamente', tipo: 'exito' });
    },
    onError: (error: any) =>
      setToast({ mensaje: error.response?.data?.error || 'Error al desactivar turno', tipo: 'error' }),
  });

  // Flatten ventanas → filas de docente con estado de tiempo real calculado
  const filas = useMemo(() => {
    const now = new Date();
    const lista: any[] = [];
    (ventanas || []).filter((ventana: any) => ventana.estado !== 'CANCELADO').forEach((ventana: any) => {
      const vFecha = new Date(ventana.fecha);
      const y = vFecha.getUTCFullYear();
      const m = vFecha.getUTCMonth();
      const d = vFecha.getUTCDate();
      
      const [hIni, mIni] = ventana.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = ventana.hora_fin.split(':').map(Number);
      
      const fechaHoraInicio = new Date(y, m, d, hIni, mIni, 0);
      const fechaHoraFin = new Date(y, m, d, hFin, mFin, 0);

      const fechaStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      let razonTiempo: string;
      if (now < fechaHoraInicio) razonTiempo = 'AUN_NO_ES_SU_TURNO';
      else if (now > fechaHoraFin) razonTiempo = 'TURNO_VENCIDO';
      else razonTiempo = 'EN_TURNO';

      (ventana.atenciones || []).forEach((atencion: any) => {
        lista.push({
          id: `${ventana.id}-${atencion.id_docente}`,
          idVentana: ventana.id,
          idDocente: atencion.id_docente,
          orden: ventana.orden,
          docente: `${atencion.docente.nombres} ${atencion.docente.apellidos}`,
          categoria: ventana.categoria,
          modalidad: ventana.modalidad,
          fecha: fechaStr,
          hora: `${ventana.hora_inicio} – ${ventana.hora_fin}`,
          horaInicio: ventana.hora_inicio,
          horaFin: ventana.hora_fin,
          estadoAtencion: atencion.estado,
          razonTiempo,
          cargoHorario: atencion.cargoHorario,
        });
      });
    });
    return lista.sort((a, b) => {
      const ordMod: Record<string, number> = { NOMBRADO: 0, CONTRATADO: 1 };
      const ordCat: Record<string, number> = { PRINCIPAL: 0, ASOCIADO: 1, AUXILIAR: 2, JEFE_PRACTICA: 3 };
      const mod = (ordMod[a.modalidad] ?? 9) - (ordMod[b.modalidad] ?? 9);
      if (mod !== 0) return mod;
      return (ordCat[a.categoria] ?? 9) - (ordCat[b.categoria] ?? 9);
    });
  }, [ventanas]);

  const ventanasActivas = useMemo(
    () => (ventanas || []).filter((ventana: any) => ventana.estado !== 'CANCELADO'),
    [ventanas]
  );

  const totalVentanas = ventanasActivas.length;
  const totalDocentes = filas.length;
  const enTurnoAhora = filas.filter((f) => f.razonTiempo === 'EN_TURNO').length;
  const completados = filas.filter((f) => f.estadoAtencion === 'COMPLETADO').length;

  const rangoVentana = useMemo(() => {
    if (ventanasActivas.length === 0) return null;
    const fechas = ventanasActivas.map((v: any) => new Date(v.fecha));
    const fechaMin = new Date(Math.min(...fechas.map((f: Date) => f.getTime())));
    const fechaMax = new Date(Math.max(...fechas.map((f: Date) => f.getTime())));
    const horaMin = ventanasActivas.reduce((acc: string, v: any) => v.hora_inicio < acc ? v.hora_inicio : acc, '23:59');
    const horaMax = ventanasActivas.reduce((acc: string, v: any) => v.hora_fin > acc ? v.hora_fin : acc, '00:00');
    return { fechaInicio: formatearFecha(fechaMin), fechaFin: formatearFecha(fechaMax), horaInicio: horaMin, horaFin: horaMax };
  }, [ventanasActivas]);

  useEffect(() => {
    if (rangoVentana && !mostrarEdicion) {
      setFechaInicio(rangoVentana.fechaInicio);
      setFechaFin(rangoVentana.fechaFin);
      setHoraInicio(rangoVentana.horaInicio);
      setHoraFin(rangoVentana.horaFin);
    }
  }, [rangoVentana, mostrarEdicion]);

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-8 py-8 text-white shadow-xl relative">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/80 mb-3">
              Gestión de turnos
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Ventanas de Atención</h1>
            <p className="text-sm text-white/70 mt-1">
              Control de acceso por tiempo — los docentes solo pueden asignar horarios durante su turno.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-64">
              <Selector
                label=""
                opciones={[
                  { valor: '', etiqueta: 'Seleccionar periodo' },
                  ...(periodos || []).map((p: any) => ({ valor: String(p.id), etiqueta: p.nombre })),
                ]}
                value={idPeriodo?.toString() || ''}
                onChange={(e) => setIdPeriodo(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="border-white/20 bg-white/90 text-slate-900"
              />
            </div>
            <Boton onClick={() => router.push('/dashboard/secretaria/ventanas/crear')} className="whitespace-nowrap">
              + Crear ventana
            </Boton>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {totalVentanas > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ventanas configuradas', value: totalVentanas, color: 'text-slate-800' },
            { label: 'Docentes con turno',    value: totalDocentes, color: 'text-slate-800' },
            { label: 'En turno ahora',        value: enTurnoAhora,  color: 'text-emerald-700' },
            { label: 'Completados',           value: completados,   color: 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <p className={cn('text-3xl font-extrabold', color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ventana actual config */}
      {totalVentanas > 0 && rangoVentana && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-blue-500 inline-block" />
              Configuración actual de ventanas
            </h2>
            <div className="flex gap-2">
              <Boton variante="secundario" onClick={() => setMostrarEdicion((prev) => !prev)}>
                {mostrarEdicion ? 'Cancelar' : 'Editar parámetros'}
              </Boton>
              <Boton
                variante="peligro"
                onClick={() => {
                  if (!idPeriodo) return;
                  if (confirm('¿Desactivar todas las ventanas de este periodo?')) desactivarMutation.mutate();
                }}
                disabled={!idPeriodo || desactivarMutation.isPending}
              >
                {desactivarMutation.isPending ? 'Desactivando...' : 'Desactivar todo'}
              </Boton>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Fecha inicio</p>
                <p className="font-bold text-slate-800">{rangoVentana.fechaInicio}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Fecha fin</p>
                <p className="font-bold text-slate-800">{rangoVentana.fechaFin}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Hora inicio diaria</p>
                <p className="font-bold text-slate-800">{rangoVentana.horaInicio}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Hora fin diaria</p>
                <p className="font-bold text-slate-800">{rangoVentana.horaFin}</p>
              </div>
            </div>

            {mostrarEdicion && (
              <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Fecha inicio
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Fecha fin
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Hora inicio
                  <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Hora fin
                  <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                </label>
                <Boton onClick={() => actualizarMutation.mutate()} disabled={actualizarMutation.isPending}>
                  {actualizarMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Boton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla de turnos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-emerald-500 inline-block" />
            Turnos de docentes
            <span className="ml-1 text-xs text-slate-400 font-normal">ordenado por modalidad → categoría → antigüedad</span>
          </h2>
        </div>

        {ventanasLoading ? (
          <div className="p-8 flex justify-center"><SpinnerCarga /></div>
        ) : filas.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4">📅</div>
            <p className="text-slate-600 font-semibold">No hay ventanas configuradas</p>
            <p className="text-sm text-slate-400 mt-1 mb-6">Crea una nueva ventana para asignar turnos automáticamente.</p>
            <Boton onClick={() => router.push('/dashboard/secretaria/ventanas/crear')}>
              Crear primera ventana
            </Boton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Modalidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario de turno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado Horario</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map((fila) => (
                  <tr key={fila.id} className={cn(
                    'transition-colors',
                    fila.razonTiempo === 'EN_TURNO' ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/60'
                  )}>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{fila.orden}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{fila.docente}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {fila.modalidad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {fila.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{fila.fecha}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">{fila.hora}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge razon={fila.razonTiempo} />
                    </td>
                    <td className="px-4 py-3">
                      {fila.cargoHorario ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <Check className="w-3 h-3" /> CARGADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          <Clock className="w-3 h-3" /> PENDIENTE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setTurnoAEditar(fila);
                            setEdicionTurno({
                              fecha: fila.fecha,
                              horaInicio: fila.horaInicio,
                              horaFin: fila.horaFin,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar turno"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Desactivar turno de ${fila.docente}?`)) {
                              desactivarTurnoMutation.mutate({
                                idVentana: fila.idVentana,
                                idDocente: fila.idDocente,
                              });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Desactivar turno"
                          disabled={desactivarTurnoMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!turnoAEditar}
        onClose={() => setTurnoAEditar(null)}
        titulo="Reasignar Turno de Docente"
        className="max-w-md"
      >
        {turnoAEditar && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-indigo-900">{turnoAEditar.docente}</p>
                <p className="text-xs text-indigo-700">
                  {turnoAEditar.modalidad} — {turnoAEditar.categoria}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nueva Fecha
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={edicionTurno.fecha}
                    onChange={(e) => setEdicionTurno({ ...edicionTurno, fecha: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Hora Inicio
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={edicionTurno.horaInicio}
                      onChange={(e) => setEdicionTurno({ ...edicionTurno, horaInicio: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Hora Fin
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={edicionTurno.horaFin}
                      onChange={(e) => setEdicionTurno({ ...edicionTurno, horaFin: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Boton
                variante="borde"
                onClick={() => setTurnoAEditar(null)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Boton>
              <Boton
                onClick={() => actualizarTurnoMutation.mutate()}
                disabled={actualizarTurnoMutation.isPending}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
              >
                {actualizarTurnoMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </Boton>
            </div>
          </div>
        )}
      </Modal>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
