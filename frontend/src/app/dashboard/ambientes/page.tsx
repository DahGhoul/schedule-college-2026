'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ambientesService } from '@/services/ambientes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;
const HORAS = Array.from({ length: 15 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`);

const columnas = [
  { clave: 'codigo', titulo: 'Código de Ambiente' },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    render: (item: any) => {
      const isLab = item.tipo === 'LABORATORIO';
      return (
        <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${isLab ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
          {item.tipo}
        </span>
      );
    },
  },
  { clave: 'capacidad', titulo: 'Capacidad', render: (item: any) => `${item.capacidad} carpetas` },
  { clave: 'piso', titulo: 'Piso', render: (item: any) => `${item.piso || '-'}° Piso` },
  { clave: 'equipamiento', titulo: 'Equipamiento', render: (item: any) => item.equipamiento || '-' },
  {
    clave: 'activo',
    titulo: 'Estado',
    render: (item: any) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
];

export default function AmbientesPage() {
  const [buscar, setBuscar] = useState('');
  const [idAmbienteSeleccionado, setIdAmbienteSeleccionado] = useState<number | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [notificacion, setNotificacion] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['ambientes'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const { data: disponibilidadDeclarada } = useQuery({
    queryKey: ['ambiente-disponibilidad-declarada', idAmbienteSeleccionado],
    queryFn: () => ambientesService.obtenerDisponibilidadDeclarada(idAmbienteSeleccionado as number).then((res) => res.data),
    enabled: !!idAmbienteSeleccionado,
  });

  const ambientes = response?.data || response || [];

  useEffect(() => {
    const siguiente: Record<string, boolean> = {};
    for (const dia of DIAS) {
      for (const hora of HORAS) {
        siguiente[`${dia}|${hora}`] = false;
      }
    }

    for (const slot of disponibilidadDeclarada || []) {
      siguiente[`${slot.dia_semana}|${slot.hora_inicio}`] = !!slot.disponible;
    }

    setDisponibilidad(siguiente);
  }, [disponibilidadDeclarada, idAmbienteSeleccionado]);

  const alternarSlot = (dia: string, hora: string) => {
    setDisponibilidad((actual) => ({
      ...actual,
      [`${dia}|${hora}`]: !actual[`${dia}|${hora}`],
    }));
  };

  const guardarDisponibilidad = async () => {
    if (!idAmbienteSeleccionado) return;
    setGuardando(true);
    try {
      const payload = Object.entries(disponibilidad).map(([clave, disponible]) => {
        const [diaSemana, horaInicio] = clave.split('|');
        const horaFin = `${String(parseInt(horaInicio.slice(0, 2), 10) + 1).padStart(2, '0')}:00`;
        return { diaSemana, horaInicio, horaFin, disponible };
      });

      await ambientesService.guardarDisponibilidadDeclarada(idAmbienteSeleccionado, payload);
      setNotificacion({ mensaje: 'Disponibilidad del ambiente guardada', tipo: 'exito' });
    } catch (error: any) {
      setNotificacion({
        mensaje: error.response?.data?.error || 'No se pudo guardar la disponibilidad',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
      setTimeout(() => setNotificacion(null), 5000);
    }
  };

  const datosFiltrados = ambientes.filter((a: any) => 
    a.codigo.toLowerCase().includes(buscar.toLowerCase()) ||
    (a.equipamiento && a.equipamiento.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {notificacion && <NotificacionToast mensaje={notificacion.mensaje} tipo={notificacion.tipo} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Aulas y Laboratorios</h1>
          <p className="text-sm text-gray-500">Gestione la infraestructura física, capacidades y equipamiento para las clases.</p>
        </div>
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar ambiente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad declarada de ambientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Selector
              label="Ambiente"
              opciones={[
                { valor: '', etiqueta: 'Selecciona un ambiente' },
                ...ambientes.map((a: any) => ({ valor: String(a.id), etiqueta: `${a.codigo} - ${a.tipo}` })),
              ]}
              value={idAmbienteSeleccionado?.toString() || ''}
              onChange={(e) => setIdAmbienteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          {idAmbienteSeleccionado ? (
            <div className="space-y-4">
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

              <div className="flex justify-end">
                <Boton onClick={guardarDisponibilidad} cargando={guardando} className="bg-sky-600 hover:bg-sky-700">
                  {guardando ? 'Guardando...' : 'Guardar disponibilidad'}
                </Boton>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Selecciona un ambiente para editar su disponibilidad declarada.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12"><SpinnerCarga /></div>
          ) : (
            <TablaDatos
              columnas={columnas}
              datos={datosFiltrados}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
