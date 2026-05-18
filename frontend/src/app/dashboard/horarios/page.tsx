'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { ambientesService } from '@/services/ambientes.service';
import { docentesService } from '@/services/docentes.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { CalendarioGeneral } from '../../../components/horarios/CalendarioGeneral';
import { useAuthStore } from '@/stores/auth.store';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { apiClient } from '@/lib/api-client';

export default function HorariosDashboardPage() {
  const { usuario } = useAuthStore();
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'AULA' | 'DOCENTE'>('AULA');
  const [filtroId, setFiltroId] = useState<number | null>(null);
  const [idAmbienteAsignacion, setIdAmbienteAsignacion] = useState<number | null>(null);
  const [metodoGeneracion, setMetodoGeneracion] = useState<'HEURISTICO' | 'GENETICO'>('HEURISTICO');
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [notificacion, setNotificacion] = useState<{mensaje: string, tipo: 'exito' | 'error'} | null>(null);

  // Cargar periodos
  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  // Cargar ambientes
  const { data: ambientes } = useQuery({
    queryKey: ['ambientes'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  // Seleccionar automáticamente el primer periodo activo si no hay uno seleccionado
  useEffect(() => {
    if (!idPeriodo && periodos?.length > 0) {
      const activo = periodos.find((p: any) => p.estado === 'ACTIVO');
      if (activo) setIdPeriodo(activo.id);
      else setIdPeriodo(periodos[0].id);
    }
  }, [idPeriodo, periodos]);

  useEffect(() => {
    if (usuario?.rol === 'PROFESOR' && usuario.idDocente) {
      setFiltroTipo('DOCENTE');
      setFiltroId(usuario.idDocente);
    }
  }, [usuario]);

  const publicarHorario = async () => {
    if (!idPeriodo) return;
    setCargando(true);
    try {
      const res = await apiClient.post('/horarios/publicar', { idPeriodo });
      setNotificacion({ mensaje: res.data.mensaje || 'Horario publicado exitosamente', tipo: 'exito' });
    } catch (error: any) {
      setNotificacion({ mensaje: error.response?.data?.error || 'Error al publicar', tipo: 'error' });
    } finally {
      setCargando(false);
      setTimeout(() => setNotificacion(null), 5000);
    }
  };

  const generarAutomatico = async () => {
    if (!idPeriodo) return;
    setGenerando(true);
    try {
      const res = await apiClient.post('/horarios/generar-automatico', {
        idPeriodo,
        modoPrueba: false,
        metodo: metodoGeneracion,
      });
      const creados = res.data?.creados ?? 0;
      const etiquetaMetodo = metodoGeneracion === 'GENETICO' ? 'genética' : 'heurística';
      setNotificacion({ mensaje: `Generación ${etiquetaMetodo} completada: ${creados} bloques creados`, tipo: 'exito' });
    } catch (error: any) {
      setNotificacion({ mensaje: error.response?.data?.error || 'Error al generar horarios', tipo: 'error' });
    } finally {
      setGenerando(false);
      setTimeout(() => setNotificacion(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestor de Horarios</h1>
          <p className="text-gray-500 mt-1">Coordina clases, asigna aulas y resuelve cruces en tiempo real.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div className="w-48">
            <Selector
              label="Método"
              opciones={[
                { valor: 'HEURISTICO', etiqueta: 'Heurístico' },
                { valor: 'GENETICO', etiqueta: 'Genético' },
              ]}
              value={metodoGeneracion}
              onChange={(e) => setMetodoGeneracion(e.target.value as 'HEURISTICO' | 'GENETICO')}
            />
          </div>
          <Boton
            onClick={generarAutomatico}
            disabled={generando || !idPeriodo}
            className="bg-sky-600 hover:bg-sky-700 shadow-sky-600/20"
          >
            {generando ? 'Generando...' : 'Generar Borrador'}
          </Boton>
          <Boton 
            onClick={publicarHorario} 
            disabled={cargando || !idPeriodo} 
            className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
          >
            {cargando ? 'Publicando...' : 'Publicar Horario Oficial'}
          </Boton>
        </div>
      </div>

      {notificacion && <NotificacionToast mensaje={notificacion.mensaje} tipo={notificacion.tipo} />}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-end">
        <div className="flex-1">
          <Selector
            label="Periodo Académico"
            opciones={[
              { valor: '', etiqueta: 'Seleccione un periodo' },
              ...(periodos?.map((p: any) => ({ valor: String(p.id), etiqueta: `${p.nombre} (${p.estado})` })) || []),
            ]}
            value={idPeriodo?.toString() || ''}
            onChange={(e) => setIdPeriodo(parseInt(e.target.value))}
          />
        </div>
        {usuario?.rol !== 'PROFESOR' && (
          <>
            <div className="flex-1">
              <Selector
                label="Tipo de Vista"
                opciones={[
                  { valor: 'AULA', etiqueta: 'Vista por Aula / Laboratorio' },
                  { valor: 'DOCENTE', etiqueta: 'Vista por Docente' },
                ]}
                value={filtroTipo}
                onChange={(e) => {
                  const tipo = e.target.value as 'AULA' | 'DOCENTE';
                  setFiltroTipo(tipo);
                  setFiltroId(null);
                  setIdAmbienteAsignacion(null);
                }}
              />
            </div>
            <div className="flex-1">
              {filtroTipo === 'AULA' ? (
                <Selector
                  label="Seleccionar Ambiente"
                  opciones={[
                    { valor: '', etiqueta: 'Todos los ambientes' },
                    ...(ambientes?.map((a: any) => ({ valor: String(a.id), etiqueta: `${a.codigo} - ${a.tipo}` })) || []),
                  ]}
                  value={filtroId?.toString() || ''}
                  onChange={(e) => {
                    const valor = e.target.value ? parseInt(e.target.value) : null;
                    setFiltroId(valor);
                    setIdAmbienteAsignacion(valor);
                  }}
                />
              ) : (
                <Selector
                  label="Seleccionar Docente"
                  opciones={[
                    { valor: '', etiqueta: 'Buscar docente...' },
                    ...(docentes?.map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })) || []),
                  ]}
                  value={filtroId?.toString() || ''}
                  onChange={(e) => setFiltroId(e.target.value ? parseInt(e.target.value) : null)}
                />
              )}
            </div>
            <div className="flex-1">
              <Selector
                label="Salón para asignación"
                opciones={[
                  { valor: '', etiqueta: 'Selecciona un salón' },
                  ...(ambientes?.map((a: any) => ({ valor: String(a.id), etiqueta: `${a.codigo} - ${a.tipo}` })) || []),
                ]}
                value={idAmbienteAsignacion?.toString() || ''}
                onChange={(e) => setIdAmbienteAsignacion(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {idPeriodo ? (
          <CalendarioGeneral
            idPeriodo={idPeriodo}
            filtroTipo={filtroTipo}
            filtroId={filtroId}
            ambienteAsignacionId={idAmbienteAsignacion}
          />
        ) : (
          <div className="p-12 text-center text-gray-500">
            Selecciona un periodo académico para comenzar a gestionar el horario.
          </div>
        )}
      </div>
    </div>
  );
}
