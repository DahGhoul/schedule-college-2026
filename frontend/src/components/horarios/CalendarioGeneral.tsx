'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { GripVertical, AlertTriangle } from 'lucide-react';

interface Props {
  idPeriodo: number;
  filtroTipo: 'AULA' | 'DOCENTE';
  filtroId: number | null;
  ambienteAsignacionId?: number | null;
  modo?: 'EDICION' | 'LECTURA';
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const HORAS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

export function CalendarioGeneral({ idPeriodo, filtroTipo, filtroId, ambienteAsignacionId = null, modo = 'EDICION' }: Props) {
  const queryClient = useQueryClient();
  const [errorToast, setErrorToast] = useState<{mensaje: string, id: number} | null>(null);
  const [modoPruebaAforo, setModoPruebaAforo] = useState(false);
  
  // Drag & Drop States
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragErrorShake, setDragErrorShake] = useState<{dia: string, hora: string} | null>(null);

  // Obtener horarios asignados
  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios-general', idPeriodo, filtroTipo, filtroId],
    queryFn: async () => {
      const params: any = { idPeriodo };
      if (filtroId) {
        if (filtroTipo === 'AULA') params.idAmbiente = filtroId;
        if (filtroTipo === 'DOCENTE') params.idDocente = filtroId;
      }
      return horariosService.listarHorarios(params).then(res => res.data);
    },
    enabled: !!idPeriodo,
  });

  // Cargar Restricciones Dinámicas (Ej: Hora de almuerzo)
  const { data: configuracion } = useQuery({
    queryKey: ['configuraciones', idPeriodo],
    queryFn: async () => {
      // Simulado o desde endpoint
      // const res = await apiClient.get(`/configuracion/restricciones?periodo=${idPeriodo}`);
      return { almuerzoInicio: '13:00', almuerzoFin: '15:00' };
    },
    enabled: !!idPeriodo,
  });

  // Cursos pendientes (mockeado hasta que se implemente endpoint real de pendientes)
  // En producción, esto vendría de un endpoint como /docentes/:id/cursos-pendientes
  const [cursosPendientes, setCursosPendientes] = useState([
    { id: 1, nombre: 'Matemática Básica', tipo: 'TEORIA', horasFaltantes: 4, docente: { id: 1, apellidos: 'Pérez' }, grupo: { codigo_grupo: 'A', capacidad_maxima: 45 } },
    { id: 2, nombre: 'Programación I', tipo: 'LABORATORIO', horasFaltantes: 2, docente: { id: 2, apellidos: 'Sánchez' }, grupo: { codigo_grupo: 'B', capacidad_maxima: 20 } },
  ]);

  const showError = (mensaje: string) => {
    setErrorToast({ mensaje, id: Date.now() });
    setTimeout(() => setErrorToast(null), 4000);
  };

  const mutacionAsignar = useMutation({
    mutationFn: async (datos: { payload: any; pendingCourseId?: number }) => {
      return horariosService.seleccionarCelda(datos.payload);
    },
    onSuccess: (_res, datos) => {
      queryClient.invalidateQueries({ queryKey: ['horarios-general'] });
      if (datos.pendingCourseId) {
        setCursosPendientes(prev => prev.map(c =>
          c.id === datos.pendingCourseId
            ? { ...c, horasFaltantes: Math.max(0, c.horasFaltantes - 1) }
            : c
        ));
      }
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || 'Error al asignar horario. Cruce detectado.');
      if (draggedItem?.target) {
        setDragErrorShake(draggedItem.target);
        setTimeout(() => setDragErrorShake(null), 500);
      }
    }
  });

  // Helpers
  const getCelda = (dia: string, hora: string) => {
    if (!horarios) return [];
    return horarios.filter((h: any) => h.dia_semana === dia && h.hora_inicio === hora);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: any, isFromGrid: boolean = false) => {
    setDraggedItem({ ...item, isFromGrid });
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dia: string, hora: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    // Smart Highlight: Pre-validación de Aforo
    if (filtroTipo === 'AULA' && draggedItem.grupo) {
      // Supongamos que conocemos la capacidad del aula actual (filtroId).
      // Aquí se pintaría de rojo. Simulamos con e.dataTransfer.dropEffect
    }
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dia: string, hora: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (filtroTipo === 'AULA' && !filtroId) {
      showError('Selecciona un ambiente antes de asignar un curso.');
      setDraggedItem(null);
      return;
    }

    if (filtroTipo === 'DOCENTE' && !ambienteAsignacionId) {
      showError('Selecciona un salón para asignar el curso en vista por docente.');
      setDraggedItem(null);
      return;
    }
    
    const horaFin = `${(parseInt(hora) + 1).toString().padStart(2, '0')}:00`;
    
    // Preparar payload
    const payload = {
      idDocente: draggedItem.docente?.id || draggedItem.id_docente,
      idCurso: draggedItem.id_curso || draggedItem.idCurso || draggedItem.id,
      idGrupo: draggedItem.grupo?.id || draggedItem.id_grupo,
      idAmbiente: filtroTipo === 'AULA' ? filtroId : ambienteAsignacionId,
      modoPrueba: modoPruebaAforo,
      tipoClase: draggedItem.tipo || draggedItem.tipo_clase || 'TEORIA',
      diaSemana: dia,
      horaInicio: hora,
      horaFin,
      sesionId: crypto.randomUUID()
    };

    if (!payload.idDocente || !payload.idCurso || !payload.idAmbiente) {
      showError('Faltan datos obligatorios para asignar (docente, curso o ambiente).');
      setDraggedItem(null);
      return;
    }

    // Validación de Aforo Premium
    if (filtroTipo === 'AULA' && draggedItem.grupo?.capacidad_maxima > 30) {
      // Simulación de validación de aforo del aula actual
      showError(`Advertencia: El grupo tiene ${draggedItem.grupo.capacidad_maxima} alumnos y podría exceder el aforo.`);
    }

    draggedItem.target = { dia, hora };
    mutacionAsignar.mutate({
      payload,
      pendingCourseId: !draggedItem.isFromGrid ? draggedItem.id : undefined,
    });
    
    setDraggedItem(null);
  };

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerCarga /></div>;

  return (
    <div className="flex gap-4 p-4 items-start bg-slate-50 relative">
      {/* Toast Absoluto */}
      {errorToast && (
        <div className="fixed top-20 right-10 z-50">
          <NotificacionToast mensaje={errorToast.mensaje} tipo="error" />
        </div>
      )}

      {/* Panel de Horas Restantes (Sidebar) - Solo en modo EDICION */}
      {modo === 'EDICION' && (
      <div className="w-72 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Clases Pendientes
        </h3>
        <label className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <span className="font-medium">Modo prueba (ignorar aforo)</span>
          <input
            type="checkbox"
            checked={modoPruebaAforo}
            onChange={(e) => setModoPruebaAforo(e.target.checked)}
          />
        </label>
        <div className="space-y-3">
          {cursosPendientes.filter(c => c.horasFaltantes > 0).map(curso => (
            <div 
              key={`${curso.id}-${curso.tipo}`}
              draggable
              onDragStart={(e) => handleDragStart(e, curso)}
              className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-unt-primary hover:shadow-md transition-all flex items-start gap-2"
            >
              <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <div className="text-sm font-bold text-gray-800">{curso.nombre}</div>
                <div className="text-xs text-gray-500 mt-0.5">{curso.docente.apellidos} - Grupo {curso.grupo.codigo_grupo}</div>
                <div className="mt-2 flex justify-between items-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${curso.tipo === 'TEORIA' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {curso.tipo}
                  </span>
                  <span className="text-xs font-semibold text-unt-primary">{curso.horasFaltantes}h faltantes</span>
                </div>
              </div>
            </div>
          ))}
          {cursosPendientes.filter(c => c.horasFaltantes > 0).length === 0 && (
            <div className="text-center p-4 text-gray-400 text-sm border-2 border-dashed rounded-lg">
              No hay clases pendientes
            </div>
          )}
        </div>
      </div>
      )}

      {/* Grilla Interactiva */}
      <div className="flex-1 overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full min-w-[800px] border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200">
              <th className="w-20 p-3 text-xs font-semibold text-gray-500 text-center border-r border-gray-200">Hora</th>
              {DIAS.map((dia) => (
                <th key={dia} className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora} className="group hover:bg-slate-50 transition-colors">
                <td className="p-2 text-xs font-medium text-gray-500 text-center border-r border-b border-gray-100 align-top">
                  {hora}
                  <div className="text-[10px] text-gray-400 mt-1">
                    {(parseInt(hora) + 1).toString().padStart(2, '0')}:00
                  </div>
                </td>
                {DIAS.map((dia) => {
                  const clasesEnCelda = getCelda(dia, hora);
                  
                  // Lógica Dinámica de Almuerzo basada en BD
                  let isAlmuerzo = false;
                  if (configuracion) {
                    const horaInt = parseInt(hora.split(':')[0]);
                    const inicioInt = parseInt(configuracion.almuerzoInicio.split(':')[0]);
                    const finInt = parseInt(configuracion.almuerzoFin.split(':')[0]);
                    isAlmuerzo = horaInt >= inicioInt && horaInt < finInt;
                  }

                  const isShaking = dragErrorShake?.dia === dia && dragErrorShake?.hora === hora;
                  
                  // Smart Highlight logic
                  let isSmartHighlighted = false;
                  if (draggedItem && !isAlmuerzo) {
                    // Si ya hay una clase en esta celda, pintar de rojo suave
                    if (clasesEnCelda.length > 0) isSmartHighlighted = true;
                  }

                  return (
                    <td 
                      key={`${dia}-${hora}`} 
                      onDragOver={(e) => handleDragOver(e, dia, hora)}
                      onDrop={(e) => handleDrop(e, dia, hora)}
                      className={`p-1 border-r border-b border-gray-100 relative min-h-[80px] align-top transition-all duration-200
                        ${isAlmuerzo ? 'bg-slate-50/50 crosshatch-pattern' : 'bg-white hover:bg-unt-primary/5'}
                        ${isSmartHighlighted ? 'bg-red-50/50 ring-1 ring-inset ring-red-200' : ''}
                        ${draggedItem && !isAlmuerzo && !isSmartHighlighted ? 'bg-emerald-50/20' : ''}
                      `}
                    >
                      <div className={`flex flex-col gap-1 min-h-[60px] p-1 ${isShaking ? 'animate-shake' : ''}`}>
                        {clasesEnCelda.map((clase: any, idx: number) => (
                          <div 
                            key={idx} 
                            draggable={modo === 'EDICION'}
                            onDragStart={(e) => modo === 'EDICION' && handleDragStart(e, clase, true)}
                            className={`p-2 rounded-lg text-xs border shadow-sm transition-all
                              ${modo === 'EDICION' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                              ${clase.estado === 'PUBLICADO' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                                clase.estado === 'CONFIRMADO' ? 'bg-blue-50 border-blue-200 text-blue-800' : 
                                'bg-amber-50 border-amber-200 text-amber-800'}
                            `}
                          >
                            <div className="font-bold truncate">{clase.curso?.nombre || 'Curso'}</div>
                            <div className="flex justify-between items-center mt-1 text-[10px] opacity-80">
                              <span>{clase.docente?.apellidos || 'Docente'}</span>
                              <span className="font-mono bg-white/50 px-1 rounded">
                                {filtroTipo === 'AULA' ? (clase.grupo?.codigo_grupo || 'G') : (clase.ambiente?.codigo || 'A')}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {/* Drop affordance - Solo EDICION */}
                        {modo === 'EDICION' && clasesEnCelda.length === 0 && !isAlmuerzo && (
                          <div className={`w-full h-full min-h-[40px] border-2 border-transparent border-dashed rounded-lg transition-colors flex items-center justify-center
                            ${draggedItem ? 'border-unt-primary/40 bg-unt-primary/5' : 'opacity-0 group-hover:opacity-100 group-hover:border-unt-primary/20'}
                          `}>
                            <span className={`text-[10px] font-medium ${draggedItem ? 'text-unt-primary' : 'text-unt-primary/50'}`}>
                              {draggedItem ? 'Soltar aquí' : '+ Asignar'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Estilos para patrón de almuerzo y animación shake */}
      <style dangerouslySetInnerHTML={{__html: `
        .crosshatch-pattern {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
}
