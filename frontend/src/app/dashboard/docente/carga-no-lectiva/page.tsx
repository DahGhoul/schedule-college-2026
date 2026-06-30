'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { periodosService } from '@/services/periodos.service';
import { cargaNoLectivaService, type SeccionNoLectivaKey } from '@/services/carga-no-lectiva.service';
import { useAuthStore } from '@/stores/auth.store';
import { configuracionService } from '@/services/configuracion.service';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { cn } from '@/lib/utilidades';
import { ArrowLeft, CalendarDays, FileText, Save, Trash2, UserRound, Printer, AlertCircle, Plus, LayoutList } from 'lucide-react';
import { MatrizCargaNoLectiva } from '@/components/horarios/MatrizCargaNoLectiva';

type FormularioSeccion = {
  horas: string;
  codigo_resolucion: string;
  descripcion: string;
};

type FormularioDocente = {
  codigo_ibm: string;
  modalidad: string;
  categoria: string;
  dedicacion: string;
  telefono: string;
};

type ReglasCargaNoLectiva = {
  horas_objetivo: number;
  horas_lectivas: number;
  horas_no_lectivas_requeridas: number;
  limite_min_preparacion_evaluacion: number;
  limites_fijos_por_seccion: Record<string, number>;
};

const SECCIONES: Array<{ clave: SeccionNoLectivaKey; titulo: string; ayuda: string }> = [
  { clave: 'PREPARACION_EVALUACION', titulo: 'Preparación y Evaluación', ayuda: 'Horas para preparación de clases y evaluación de actividades.' },
  { clave: 'CONSEJERIA_TUTORIA', titulo: 'Consejería y Tutoría', ayuda: 'Horas dedicadas a consejería académica y tutoría.' },
  { clave: 'INVESTIGACION', titulo: 'Investigación', ayuda: 'Registro de horas asignadas a investigación.' },
  { clave: 'CAPACITACION', titulo: 'Capacitación', ayuda: 'Horas para cursos, talleres o actualización.' },
  { clave: 'ACTIVIDADES_GOBIERNO', titulo: 'Actividades de Gobierno', ayuda: 'Participación en órganos de gobierno y reuniones.' },
  { clave: 'ACTIVIDADES_ADMINISTRACION', titulo: 'Administración', ayuda: 'Labores administrativas y de coordinación.' },
  { clave: 'ASESORIA_TESIS', titulo: 'Asesoría de Tesis / Exp. Prof.', ayuda: 'Asesorías de tesis, proyectos o experiencia profesional.' },
  { clave: 'RESPONSABILIDAD_SOCIAL', titulo: 'Responsabilidad Social', ayuda: 'Actividades de proyección y responsabilidad social.' },
  { clave: 'COMITES_COMISIONES', titulo: 'Comités y Comisiones', ayuda: 'Participación en comités y comisiones institucionales.' },
];

const MODALIDADES = [
  { valor: 'NOMBRADO', etiqueta: 'Nombrado' },
  { valor: 'CONTRATADO', etiqueta: 'Contratado' },
];

const CATEGORIAS = [
  { valor: 'PRINCIPAL', etiqueta: 'Principal' },
  { valor: 'ASOCIADO', etiqueta: 'Asociado' },
  { valor: 'AUXILIAR', etiqueta: 'Auxiliar' },
  { valor: 'JEFE_PRACTICA', etiqueta: 'Jefe de Práctica' },
  { valor: 'PROFESOR', etiqueta: 'Profesor' },
  { valor: 'ALUMNO', etiqueta: 'Alumno' },
];

const DEDICACIONES = [
  { valor: 'TIEMPO_COMPLETO_40H', etiqueta: 'Tiempo Completo 40h' },
  { valor: 'DEDICACION_EXCLUSIVA_40H', etiqueta: 'Dedicación Exclusiva 40h' },
  { valor: 'TIEMPO_PARCIAL_20H', etiqueta: 'Tiempo Parcial 20h' },
  { valor: 'TIEMPO_PARCIAL_16H', etiqueta: 'Tiempo Parcial 16h' },
  { valor: 'TIEMPO_PARCIAL_12H', etiqueta: 'Tiempo Parcial 12h' },
  { valor: 'TIEMPO_PARCIAL_10H', etiqueta: 'Tiempo Parcial 10h' },
  { valor: 'TIEMPO_PARCIAL_8H', etiqueta: 'Tiempo Parcial 8h' },
];

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

const crearSeccionesIniciales = () =>
  SECCIONES.reduce((acumulado, seccion) => {
    acumulado[seccion.clave] = {
      horas: '',
      codigo_resolucion: '',
      descripcion: '',
    };
    return acumulado;
  }, {} as Record<SeccionNoLectivaKey, FormularioSeccion>);

const crearDocenteInicial = (): FormularioDocente => ({
  codigo_ibm: '',
  modalidad: 'NOMBRADO',
  categoria: 'PRINCIPAL',
  dedicacion: 'TIEMPO_COMPLETO_40H',
  telefono: '',
});

const formatearHoras = (valor: number) => (Number.isInteger(valor) ? `${valor}` : valor.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export default function CargaNoLectivaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { usuario } = useAuthStore();
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [docente, setDocente] = useState<FormularioDocente>(crearDocenteInicial());
  const [secciones, setSecciones] = useState<Record<SeccionNoLectivaKey, FormularioSeccion>>(crearSeccionesIniciales());
  const [habilitaGobierno, setHabilitaGobierno] = useState(false);
  const [habilitaAdministracion, setHabilitaAdministracion] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const [pestanaActiva, setPestanaActiva] = useState<'declaracion' | 'calendario' | 'formatos'>('declaracion');

  const [seccionActiva, setSeccionActiva] = useState<SeccionNoLectivaKey | null>(null);
  const [bloquesAsignados, setBloquesAsignados] = useState<any[]>([]);
  const [erroresSecciones, setErroresSecciones] = useState<Record<string, string>>({});

  const { data: periodosData } = useQuery({
    queryKey: ['periodos-carga-no-lectiva'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const { data: restricciones } = useQuery({
    queryKey: ['restricciones'],
    queryFn: () => configuracionService.obtenerRestricciones().then((res) => res.data.data || res.data),
  });

  const periodos = Array.isArray(periodosData) ? periodosData : periodosData?.data || [];

  useEffect(() => {
    if (periodos.length > 0 && idPeriodo === 0) {
      const periodoActivo = periodos.find((periodo: any) => periodo.activo);
      if (periodoActivo) {
        setIdPeriodo(periodoActivo.id);
      }
    }
  }, [periodos, idPeriodo]);

  const { data: declaracionData, isLoading: cargandoDeclaracion } = useQuery({
    queryKey: ['mi-carga-no-lectiva', usuario?.idDocente, idPeriodo],
    queryFn: () => cargaNoLectivaService.obtenerMiDeclaracion(idPeriodo).then((res) => res.data),
    enabled: !!usuario?.idDocente && idPeriodo > 0,
  });

  const reglas: ReglasCargaNoLectiva | null = declaracionData?.reglas ?? null;
  const sugeridas: Partial<Record<SeccionNoLectivaKey, number>> = declaracionData?.secciones_sugeridas ?? {};

  const { data: horarioData } = useQuery({
    queryKey: ['horario-docente-combinado', usuario?.idDocente, idPeriodo],
    queryFn: async () => {
      const res = await cargaNoLectivaService.obtenerMiHorarioNoLectivo(idPeriodo);
      return res.data;
    },
    enabled: !!usuario?.idDocente && idPeriodo > 0 && !!declaracionData?.declaracion?.id,
  });

  useEffect(() => {
    if (horarioData?.no_lectivos) {
      setBloquesAsignados(horarioData.no_lectivos.map((b: any) => ({
        dia_semana: b.dia_semana,
        hora_inicio: b.hora_inicio.substring(0, 5),
        hora_fin: b.hora_fin.substring(0, 5),
        seccion: b.seccion
      })));
    }
  }, [horarioData]);

  useEffect(() => {
    if (declaracionData?.docente) {
      setDocente({
        codigo_ibm: declaracionData.docente.codigo_ibm ?? '',
        modalidad: declaracionData.docente.modalidad ?? 'NOMBRADO',
        categoria: declaracionData.docente.categoria ?? 'PRINCIPAL',
        dedicacion: declaracionData.docente.dedicacion ?? 'TIEMPO_COMPLETO_40H',
        telefono: declaracionData.docente.telefono ?? '',
      });
    } else if (usuario?.docente) {
      setDocente((actual) => ({
        ...actual,
        categoria: usuario.docente?.categoria || actual.categoria,
      }));
    }

    const nuevasSecciones = crearSeccionesIniciales();
    const seccionesGuardadas = declaracionData?.declaracion?.secciones || [];
    if (seccionesGuardadas.length > 0) {
      seccionesGuardadas.forEach((seccion: any) => {
        if (seccion?.seccion && nuevasSecciones[seccion.seccion as SeccionNoLectivaKey]) {
          nuevasSecciones[seccion.seccion as SeccionNoLectivaKey] = {
            horas: String(seccion.horas_declaradas ?? 0),
            codigo_resolucion: seccion.codigo_resolucion ?? '',
            descripcion: seccion.descripcion ?? '',
          };
        }
      });
    } else {
      SECCIONES.forEach((seccion) => {
        const sugerida = Number(sugeridas?.[seccion.clave] ?? 0);
        if (sugerida > 0) {
          nuevasSecciones[seccion.clave].horas = String(sugerida);
        }
      });
    }

    setHabilitaGobierno(Boolean(declaracionData?.banderas?.habilita_actividades_gobierno));
    setHabilitaAdministracion(Boolean(declaracionData?.banderas?.habilita_actividades_administracion));

    setSecciones(nuevasSecciones);
  }, [declaracionData, usuario]);

  useEffect(() => {
    validarSeccionesEnTiempoReal();
  }, [secciones, reglas]);

  const validarSeccionesEnTiempoReal = () => {
    const nuevosErrores: Record<string, string> = {};
    if (!reglas) return setErroresSecciones(nuevosErrores);

    const horasPreparacion = Number(secciones.PREPARACION_EVALUACION.horas || 0);
    const limiteMinPreparacion = Number(reglas.limite_min_preparacion_evaluacion || 0);
    if (horasPreparacion < limiteMinPreparacion) {
      nuevosErrores.PREPARACION_EVALUACION = `Mínimo requerido: ${formatearHoras(limiteMinPreparacion)}h (50% de la carga lectiva).`;
    }

    if (reglas.limites_fijos_por_seccion) {
      Object.entries(reglas.limites_fijos_por_seccion).forEach(([clave, max]) => {
        const limite = Number(max);
        const horas = Number(secciones[clave as SeccionNoLectivaKey]?.horas || 0);
        if (limite > 0 && horas > limite) {
          nuevosErrores[clave] = `Máximo permitido: ${formatearHoras(limite)}h.`;
        }
      });
    }

    const horasGobierno = Number(secciones.ACTIVIDADES_GOBIERNO.horas || 0);
    // Ya no bloqueamos por frontend, se valida administrativamente con la resolución
    
    const horasAdministracion = Number(secciones.ACTIVIDADES_ADMINISTRACION.horas || 0);
    // Ya no bloqueamos por frontend, se valida administrativamente con la resolución

    setErroresSecciones(nuevosErrores);
  };

  const mutationGuardar = useMutation({
    mutationFn: (datos: any) => cargaNoLectivaService.guardarMiDeclaracion(idPeriodo, datos),
    onSuccess: async (response: any) => {
      setToast({ mensaje: 'Carga no lectiva guardada correctamente', tipo: 'exito' });
      await queryClient.invalidateQueries({ queryKey: ['mi-carga-no-lectiva', usuario?.idDocente, idPeriodo] });
      setPestanaActiva('calendario');
      if (response?.data?.docente) {
        setDocente({
          codigo_ibm: response.data.docente.codigo_ibm ?? '',
          modalidad: response.data.docente.modalidad ?? 'NOMBRADO',
          categoria: response.data.docente.categoria ?? 'PRINCIPAL',
          dedicacion: response.data.docente.dedicacion ?? 'TIEMPO_COMPLETO_40H',
          telefono: response.data.docente.telefono ?? '',
        });
      }
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'No se pudo guardar la carga no lectiva', tipo: 'error' });
    },
  });

  const mutationGuardarHorario = useMutation({
    mutationFn: () => cargaNoLectivaService.guardarMiHorarioNoLectivo(idPeriodo, bloquesAsignados),
    onSuccess: async () => {
      setToast({ mensaje: 'Horario no lectivo guardado correctamente', tipo: 'exito' });
      await queryClient.invalidateQueries({ queryKey: ['horario-docente-combinado', usuario?.idDocente, idPeriodo] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al guardar el horario', tipo: 'error' });
    }
  });

  const mutationEliminar = useMutation({
    mutationFn: () => cargaNoLectivaService.eliminarMiDeclaracion(idPeriodo),
    onSuccess: async () => {
      setToast({ mensaje: 'Declaración eliminada', tipo: 'exito' });
      setDocente(crearDocenteInicial());
      setSecciones(crearSeccionesIniciales());
      setHabilitaGobierno(false);
      setHabilitaAdministracion(false);
      await queryClient.invalidateQueries({ queryKey: ['mi-carga-no-lectiva', usuario?.idDocente, idPeriodo] });
      setPestanaActiva('declaracion');
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'No se pudo eliminar la declaración', tipo: 'error' });
    },
  });

  const totalHoras = Object.values(secciones).reduce((acumulado, seccion) => acumulado + Number(seccion.horas || 0), 0);
  const horasLectivas = Number(reglas?.horas_lectivas ?? 0);
  const horasObjetivo = Number(docente.dedicacion.match(/(\d+)H$/)?.[1] || reglas?.horas_objetivo || 0);
  const horasTotales = horasLectivas + totalHoras;

  const manejarCambioSeccion = (clave: SeccionNoLectivaKey, campo: keyof FormularioSeccion, valor: string) => {
    if (campo === 'horas') {
      const num = parseInt(valor, 10);
      const nuevoValor = !isNaN(num) && num >= 0 ? String(num) : valor.replace(/[^0-9]/g, '');
      setSecciones((actual) => ({
        ...actual,
        [clave]: {
          ...actual[clave],
          [campo]: nuevoValor,
        },
      }));
    } else {
      setSecciones((actual) => ({
        ...actual,
        [clave]: {
          ...actual[clave],
          [campo]: valor,
        },
      }));
    }
  };

  const handleCeldaClick = (diaSemana: string, horaInicio: string) => {
    if (!seccionActiva) {
      setToast({ mensaje: 'Primero selecciona una sección (Pinceles) de la lista inferior', tipo: 'error' });
      return;
    }
    
    const hh = parseInt(horaInicio.split(':')[0]);
    
    const isLectivo = horarioData?.lectivos?.find((l: any) => l.dia_semana === diaSemana && parseInt(l.hora_inicio) <= hh && parseInt(l.hora_fin) > hh);
    if (isLectivo) {
      setToast({ mensaje: 'Esta hora ya está ocupada por una clase lectiva.', tipo: 'error' });
      return;
    }

    const bloqueExistenteIndex = bloquesAsignados.findIndex((b) => b.dia_semana === diaSemana && b.hora_inicio === horaInicio);
    const esMismaSeccion = bloqueExistenteIndex >= 0 && bloquesAsignados[bloqueExistenteIndex].seccion === seccionActiva;

    // Si no estamos removiendo, verificamos que tengamos cupo disponible
    if (!esMismaSeccion) {
      const declaradas = Number(secciones[seccionActiva].horas) || 0;
      const asignadas = bloquesAsignados.filter((b) => b.seccion === seccionActiva).length;
      if (asignadas >= declaradas) {
        setToast({ mensaje: `No puedes exceder el máximo de horas (${declaradas}h) declaradas para esta sección.`, tipo: 'error' });
        return;
      }

      const resActivas = restricciones?.franjaInicio ? restricciones : restricciones?.data;
      const maxHorasDiarias = resActivas?.horasMaximasDiarias ? Number(resActivas.horasMaximasDiarias) : 9;

      const horasLectivasEnDia = horarioData?.lectivos?.filter((l: {dia_semana: string}) => l.dia_semana === diaSemana).reduce((acc: number, l: {hora_fin: string, hora_inicio: string}) => acc + (parseInt(l.hora_fin) - parseInt(l.hora_inicio)), 0) || 0;
      const horasNoLectivasEnDia = bloquesAsignados.filter((b) => b.dia_semana === diaSemana).length;
      
      if (horasLectivasEnDia + horasNoLectivasEnDia >= maxHorasDiarias) {
        setToast({ mensaje: `Límite diario alcanzado. No puedes asignar más de ${maxHorasDiarias}h en un mismo día (Lectiva + No Lectiva).`, tipo: 'error' });
        return;
      }
    }

    const horaFin = `${(hh + 1).toString().padStart(2, '0')}:00`;

    setBloquesAsignados((prev) => {
      const index = prev.findIndex((b) => b.dia_semana === diaSemana && b.hora_inicio === horaInicio);
      
      if (index >= 0) {
        const prevBloques = [...prev];
        if (prevBloques[index].seccion === seccionActiva) {
          prevBloques.splice(index, 1);
        } else {
          prevBloques[index] = { dia_semana: diaSemana, hora_inicio: horaInicio, hora_fin: horaFin, seccion: seccionActiva };
        }
        return prevBloques;
      }
      
      return [...prev, { dia_semana: diaSemana, hora_inicio: horaInicio, hora_fin: horaFin, seccion: seccionActiva }];
    });
  };

  const construirMatriz = () => {
    const filas = [];
    
    let inicio = 7;
    let fin = 22;
    let almuerzoInicio = -1;
    let almuerzoFin = -1;

    const resActivas = restricciones?.franjaInicio ? restricciones : restricciones?.data;

    if (resActivas) {
      if (resActivas.franjaInicio) inicio = parseInt(resActivas.franjaInicio.split(':')[0]);
      if (resActivas.franjaFin) fin = parseInt(resActivas.franjaFin.split(':')[0]);
      if (resActivas.bloqueoAlmuerzoInicio) almuerzoInicio = parseInt(resActivas.bloqueoAlmuerzoInicio.split(':')[0]);
      if (resActivas.bloqueoAlmuerzoFin) almuerzoFin = parseInt(resActivas.bloqueoAlmuerzoFin.split(':')[0]);
    }

    for (let hora = inicio; hora < fin; hora++) {
      const hh = hora.toString().padStart(2, '0');
      const horaStr = `${hh}:00`;
      
      const celdas = DIAS_SEMANA.map((dia) => {
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          return { diaSemana: dia, horaInicio: horaStr, estado: 'BLOQUEO_ALMUERZO' as const };
        }

        const bloqueLectivo = horarioData?.lectivos?.find((l: any) => l.dia_semana === dia && parseInt(l.hora_inicio) <= hora && parseInt(l.hora_fin) > hora);
        const bloqueAsignado = bloquesAsignados.find((b) => b.dia_semana === dia && b.hora_inicio === horaStr);
        
        if (bloqueLectivo) return { diaSemana: dia, horaInicio: horaStr, estado: 'LECTIVO' as const, info: { origen: bloqueLectivo.origen || 'Clase Lectiva' } };
        if (bloqueAsignado) return { diaSemana: dia, horaInicio: horaStr, estado: 'NO_LECTIVO' as const, info: { seccion: bloqueAsignado.seccion } };
        return { diaSemana: dia, horaInicio: horaStr, estado: 'LIBRE' as const };
      });
      
      filas.push({ horaInicio: horaStr, celdas });
    }
    return { filas };
  };

  const calcularProgresoAsignacion = (clave: string) => {
    const declaradas = Number(secciones[clave as SeccionNoLectivaKey].horas) || 0;
    const asignadas = bloquesAsignados.filter((b) => b.seccion === clave).length;
    return { declaradas, asignadas, completado: asignadas >= declaradas && declaradas > 0, exceso: asignadas > declaradas };
  };

  const guardarDeclaracion = () => {
    if (!usuario?.idDocente || !idPeriodo) return;

    if (reglas && Math.abs(horasTotales - horasObjetivo) > 0.01) {
      setToast({ mensaje: 'Completa la jornada para guardar', tipo: 'error' });
      return;
    }

    const payload = {
      docente: {
        codigo_ibm: docente.codigo_ibm,
        modalidad: docente.modalidad,
        categoria: docente.categoria,
        dedicacion: docente.dedicacion,
        telefono: docente.telefono,
      },
      habilita_actividades_gobierno: habilitaGobierno,
      habilita_actividades_administracion: habilitaAdministracion,
      secciones: SECCIONES.map((seccion) => ({
        seccion: seccion.clave,
        horas: Number(secciones[seccion.clave].horas || 0),
        codigo_resolucion: secciones[seccion.clave].codigo_resolucion || null,
        descripcion: secciones[seccion.clave].descripcion || null,
      })),
    };

    mutationGuardar.mutate(payload);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white shadow-xl relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/docente')} className="rounded-full p-3 text-white hover:bg-white/20 transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                Panel Docente
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Declaración Jurada y Calendario No Lectivo
              </h1>
              <p className="text-sm text-blue-100">
                Distribuye tus horas no lectivas para el período {periodos?.find((p: any) => p.id === idPeriodo)?.nombre || 'actual'}
              </p>
            </div>
          </div>

          <div className="w-full lg:w-64 space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Periodo Académico</label>
            <Selector
              value={idPeriodo}
              onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
              className="border-white/20 bg-white/95 text-slate-900 focus:border-white focus:ring-white/30 shadow-sm"
            >
              {periodos.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Selector>
          </div>
        </div>

        {/* Navegación de Pestañas */}
        <div className="relative z-10 mt-8">
          <div className="flex bg-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-inner w-fit">
            <button 
              onClick={() => setPestanaActiva('declaracion')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                pestanaActiva === 'declaracion' ? 'bg-white text-unt-primary shadow-md scale-105' : 'text-white hover:bg-white/20'
              )}
            >
              <LayoutList className="h-4 w-4" />
              1. Declaración de Horas
            </button>
            <button 
              onClick={() => {
                if (!declaracionData?.declaracion?.id) {
                  setToast({ mensaje: 'Primero debes guardar tu declaración (Paso 1)', tipo: 'error' });
                  return;
                }
                setPestanaActiva('calendario');
              }}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                pestanaActiva === 'calendario' ? 'bg-white text-unt-primary shadow-md scale-105' : 'text-white hover:bg-white/20',
                !declaracionData?.declaracion?.id ? 'opacity-50 cursor-not-allowed' : ''
              )}
            >
              <CalendarDays className="h-4 w-4" />
              2. Calendario de Distribución
            </button>
            <button 
              onClick={() => {
                if (!declaracionData?.declaracion?.id) {
                  setToast({ mensaje: 'Primero debes guardar tu declaración (Paso 1)', tipo: 'error' });
                  return;
                }
                setPestanaActiva('formatos');
              }}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                pestanaActiva === 'formatos' ? 'bg-white text-unt-primary shadow-md scale-105' : 'text-white hover:bg-white/20',
                !declaracionData?.declaracion?.id ? 'opacity-50 cursor-not-allowed' : ''
              )}
            >
              <FileText className="h-4 w-4" />
              3. Formatos
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 -mt-2">
        {!usuario?.idDocente ? (
          <Card className="border-none shadow-lg rounded-[2rem]">
            <CardContent className="py-16 text-center text-slate-500">
              Este módulo solo está disponible para docentes autenticados.
            </CardContent>
          </Card>
        ) : !idPeriodo ? (
          <Card className="border-none shadow-lg rounded-[2rem]">
            <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              Selecciona un período académico para comenzar.
            </CardContent>
          </Card>
        ) : pestanaActiva === 'declaracion' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Columna izquierda: Datos del docente y secciones no lectivas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos del docente */}
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                    <UserRound className="h-5 w-5 text-unt-primary" />
                    Datos del docente
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 pt-6">
                  <CampoTexto label="Nombres" value={declaracionData?.docente?.nombres || usuario?.docente?.nombres || ''} disabled />
                  <CampoTexto label="Apellidos" value={declaracionData?.docente?.apellidos || usuario?.docente?.apellidos || ''} disabled />
                  <CampoTexto
                    label="Código IBM"
                    value={docente.codigo_ibm}
                    onChange={(e) => setDocente((actual) => ({ ...actual, codigo_ibm: e.target.value }))}
                    placeholder="Ingresa tu IBM"
                    disabled={Boolean(declaracionData?.docente?.codigo_ibm)}
                    ayuda={declaracionData?.docente?.codigo_ibm ? 'El código IBM es inmutable una vez registrado.' : undefined}
                  />
                  <Selector
                    label="Condición"
                    value={docente.modalidad}
                    onChange={(e: any) => setDocente((actual) => ({ ...actual, modalidad: e.target.value }))}
                  >
                    {MODALIDADES.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </Selector>
                  <Selector
                    label="Categoría"
                    value={docente.categoria}
                    onChange={(e: any) => setDocente((actual) => ({ ...actual, categoria: e.target.value }))}
                  >
                    {CATEGORIAS.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </Selector>
                  <Selector
                    label="Dedicación"
                    value={docente.dedicacion}
                    onChange={(e: any) => setDocente((actual) => ({ ...actual, dedicacion: e.target.value }))}
                  >
                    {DEDICACIONES.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </Selector>
                  <CampoTexto
                    label="Teléfono"
                    value={docente.telefono}
                    onChange={(e) => setDocente((actual) => ({ ...actual, telefono: e.target.value }))}
                    placeholder="Opcional"
                  />
                  <CampoTexto
                    label="Correo institucional"
                    value={declaracionData?.docente?.email || usuario?.email || ''}
                    disabled
                  />
                </CardContent>
              </Card>

              {/* Secciones no lectivas */}
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                    <FileText className="h-5 w-5 text-unt-primary" />
                    Secciones no lectivas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {SECCIONES.map((seccion) => {
                    const deshabilitado = false;
                    const maxPermitido = reglas?.limites_fijos_por_seccion?.[seccion.clave];
                    
                    return (
                      <div key={seccion.clave} className={cn("rounded-2xl border bg-slate-50/40 p-5 shadow-sm relative group flex flex-col lg:flex-row gap-6 items-start transition-opacity", deshabilitado ? "opacity-60 border-gray-200" : "border-slate-200")}>
                        {/* Title and Help text */}
                        <div className="w-full lg:w-1/4 space-y-1">
                          <h3 className="text-sm font-bold text-slate-900">{seccion.titulo}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{seccion.ayuda}</p>
                          {deshabilitado && (
                            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded">No Habilitado</span>
                          )}
                        </div>
                        
                        {/* Description Textarea */}
                        <div className="w-full lg:w-1/2">
                          <textarea
                            value={secciones[seccion.clave].descripcion}
                            onChange={(e) => manejarCambioSeccion(seccion.clave, 'descripcion', e.target.value)}
                            disabled={deshabilitado}
                            placeholder={deshabilitado ? "Esta sección no está habilitada para tu perfil." : "Detallar número de alumnos, ciclo académico, proyectos, etc..."}
                            rows={3}
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:border-unt-primary focus:outline-none focus:ring-2 focus:ring-unt-primary/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                          />
                        </div>

                        {/* Hours and Code */}
                        <div className="w-full lg:w-1/4 flex flex-col gap-3">
                            <div className="relative">
                              <CampoTexto
                                label={maxPermitido ? `Horas (Max. ${maxPermitido}h)` : "Horas"}
                                type="number"
                                step="1"
                                min="0"
                                value={secciones[seccion.clave].horas}
                                onChange={(e) => manejarCambioSeccion(seccion.clave, 'horas', e.target.value)}
                                disabled={deshabilitado}
                                placeholder="0"
                                className={cn("text-center text-lg font-bold h-11", erroresSecciones[seccion.clave] ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50 text-red-700' : 'text-slate-800')}
                              />
                              {erroresSecciones[seccion.clave] && (
                                <p className="absolute -bottom-5 left-1 text-[10px] font-bold text-red-600 truncate max-w-full" title={erroresSecciones[seccion.clave]}>
                                  {erroresSecciones[seccion.clave]}
                                </p>
                              )}
                            </div>
                            <CampoTexto
                              label="Resolución (Opcional)"
                              value={secciones[seccion.clave].codigo_resolucion}
                              onChange={(e) => manejarCambioSeccion(seccion.clave, 'codigo_resolucion', e.target.value)}
                              disabled={deshabilitado}
                              placeholder="Ej. RES-001-2026"
                              className="text-xs h-9"
                            />
                        </div>
                      </div>
                    )})}
                  
                  {/* Totalizador de horas inferior */}
                  <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Total Horas Declaradas:</span>
                      <span className={cn(
                        "text-3xl font-black", 
                        reglas && horasTotales > horasObjetivo ? "text-red-600" : 
                        reglas && horasTotales < horasObjetivo ? "text-amber-500" : "text-emerald-600"
                      )}>
                        {formatearHoras(horasTotales)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalle de carga lectiva */}
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                  <CardTitle className="text-slate-900 text-lg">Detalle de carga lectiva asignada</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                          <th className="py-3 pr-4 font-semibold">Código</th>
                          <th className="py-3 pr-4 font-semibold">Curso</th>
                          <th className="py-3 pr-4 font-semibold">Ciclo</th>
                          <th className="py-3 pr-4 font-semibold">Componente</th>
                          <th className="py-3 pr-4 font-semibold text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(declaracionData?.carga_lectiva ?? []).map((fila: any, index: number) => (
                          <tr key={`${fila.curso_codigo}-${index}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 pr-4 font-mono">{fila.curso_codigo}</td>
                            <td className="py-3 pr-4 font-medium">{fila.curso_nombre}</td>
                            <td className="py-3 pr-4">{fila.ciclo}</td>
                            <td className="py-3 pr-4">{fila.componente}</td>
                            <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatearHoras(Number(fila.horas ?? 0))}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha: Resumen y acciones */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white py-4">
                  <CardTitle className="flex items-center gap-2 text-white text-base">
                    <Save className="h-4 w-4" />
                    Resumen de la Declaración
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5 max-h-[calc(100vh-6rem)] overflow-y-auto">
                  <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Total horas no lectivas</p>
                    <p className="text-4xl font-extrabold text-slate-900">{formatearHoras(totalHoras)}h</p>
                    <p className="mt-1 text-xs text-slate-500">Suma automática de todas las secciones declaradas.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">Validación de jornada</p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Carga lectiva:</span>
                        <span className="font-mono text-lg">{formatearHoras(horasLectivas)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Carga no lectiva:</span>
                        <span className="font-mono text-lg">{formatearHoras(totalHoras)}h</span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-base">Carga total:</span>
                          <span className="font-mono text-xl font-extrabold">{formatearHoras(horasTotales)}h</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-semibold text-slate-900">Objetivo dedicación:</span>
                          <span className="font-mono text-lg font-bold">{formatearHoras(horasObjetivo)}h</span>
                        </div>
                      </div>
                    </div>
                    {horasObjetivo > 0 && (
                      <p className={cn(
                        'mt-4 text-xs font-bold px-3 py-2 rounded-lg text-center',
                        Math.abs(horasTotales - horasObjetivo) < 0.01 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      )}>
                        {Math.abs(horasTotales - horasObjetivo) < 0.01
                          ? '✅ La jornada está completa según dedicación.'
                          : horasTotales < horasObjetivo
                            ? `⚠️ Faltan ${formatearHoras(horasObjetivo - horasTotales)}h para completar la jornada.`
                            : `⚠️ Sobran ${formatearHoras(horasTotales - horasObjetivo)}h (has excedido tu jornada).`}
                      </p>
                    )}
                  </div>



                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">Datos guardados</p>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">Periodo:</span>
                        <span>{periodos.find((p: any) => p.id === idPeriodo)?.nombre || idPeriodo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">IBM:</span>
                        <span>{docente.codigo_ibm || 'Pendiente'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">Condición:</span>
                        <span>{docente.modalidad}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">Categoría:</span>
                        <span>{docente.categoria}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Boton
                      onClick={guardarDeclaracion}
                      className="w-full justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-unt-primary to-[#0f4c81] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-unt-primary/20 hover:from-[#0a2a52] hover:to-[#0a3a6e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      cargando={mutationGuardar.isPending || cargandoDeclaracion}
                      disabled={Math.abs(horasTotales - horasObjetivo) > 0.01 || Object.keys(erroresSecciones).length > 0}
                    >
                      <Save className="h-4 w-4" />
                      {mutationGuardar.isPending ? 'Guardando...' : 'Guardar y Continuar'}
                    </Boton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : pestanaActiva === 'calendario' ? (
          <div className="grid grid-cols-1 gap-8">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-md" id="paso2">
              <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-6 px-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <CalendarDays className="h-6 w-6" />
                  Paso 2: Distribución de Horario No Lectivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-10 px-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 backdrop-blur-sm shadow-sm flex gap-4 items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p><strong>Instrucciones:</strong> Asigna tus bloques horarios en el calendario guiándote de los "Pinceles" inferiores.</p>
                    <ul className="list-disc pl-5 opacity-90 text-xs">
                      <li>Selecciona una sección no lectiva en la paleta lateral.</li>
                      <li>Haz clic en los espacios libres del calendario (gris son tus clases lectivas inmodificables).</li>
                      <li>Asegúrate de pintar exactamente las mismas horas que declaraste.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  
                  {/* Pinceles Laterales */}
                  <div className="w-full xl:w-72 flex-shrink-0 bg-slate-50/80 rounded-2xl p-5 border border-slate-200 shadow-sm xl:sticky xl:top-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Paleta de Secciones
                    </h4>
                    <div className="flex flex-row xl:flex-col flex-wrap gap-3">
                      {Object.entries(secciones)
                        .filter(([k, v]) => Number(v.horas) > 0)
                        .map(([clave, v]) => {
                          const progreso = calcularProgresoAsignacion(clave);
                          return (
                            <button
                              key={clave}
                              onClick={() => setSeccionActiva(clave as SeccionNoLectivaKey)}
                              className={cn(
                                'flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 w-full',
                                seccionActiva === clave 
                                  ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                              )}
                            >
                              <div className="flex flex-col gap-1 w-full">
                                <span className={cn('text-xs font-bold truncate', seccionActiva === clave ? 'text-indigo-900' : 'text-slate-700')}>
                                  {SECCIONES.find(s => s.clave === clave)?.titulo || clave.replace(/_/g, ' ')}
                                </span>
                                <div className="flex items-center justify-between mt-1">
                                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', progreso.completado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                                    {progreso.asignadas} / {progreso.declaradas}h
                                  </span>
                                  {progreso.completado && <span className="text-emerald-500 text-[10px] font-bold">✓ Listo</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Calendario */}
                  <div className="flex-grow min-w-0 bg-white rounded-2xl p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 overflow-x-auto w-full">
                    <MatrizCargaNoLectiva 
                      matriz={construirMatriz()} 
                      alHacerClickCelda={handleCeldaClick} 
                      bloqueado={mutationGuardarHorario.isPending}
                    />
                  </div>
                </div>
                  
                <div className="flex justify-end pt-8 mt-6">
                  <Boton 
                    onClick={() => mutationGuardarHorario.mutate()} 
                    cargando={mutationGuardarHorario.isPending}
                    disabled={Object.keys(secciones).some((key) => {
                      const k = key as SeccionNoLectivaKey;
                      const horasStr = secciones[k].horas;
                      return Number(horasStr) > 0 && bloquesAsignados.filter((b) => b.seccion === k).length < Number(horasStr);
                    })}
                    variante="primario"
                    className="px-10 py-5 text-base rounded-[1.5rem] shadow-lg shadow-unt-primary/20 hover:scale-[1.02] transition-transform"
                  >
                    <Save className="h-5 w-5" />
                    Guardar Horario No Lectivo
                  </Boton>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-md" id="paso3">
              <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-6 px-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <FileText className="h-6 w-6" />
                  Paso 3: Formatos Automáticos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-10 px-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 backdrop-blur-sm shadow-sm flex gap-4 items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p><strong>Instrucciones:</strong> Descarga los formatos oficiales con tu declaración no lectiva ya completada.</p>
                  </div>
                </div>

                <div className="w-full">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Formatos Disponibles</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-slate-700">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                            <th className="py-3 pr-4 font-semibold">Formato</th>
                            <th className="py-3 pr-4 font-semibold">Sede</th>
                            <th className="py-3 pr-4 font-semibold">Estado</th>
                            <th className="py-3 pr-4 font-semibold text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(declaracionData?.formatos ?? []).map((formato: any) => (
                            <tr key={formato.tipo} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 pr-4 font-medium">{formato.etiqueta}</td>
                              <td className="py-3 pr-4">{formato.sede}</td>
                              <td className="py-3 pr-4">
                                <span className={cn('inline-flex rounded-full px-3 py-1.5 text-xs font-bold', 
                                  formato.estado === 'GENERADO' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-amber-100 text-amber-700'
                                )}>
                                  {formato.estado}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <Boton
                                  onClick={() => window.open(`/imprimir/formatos/${formato.tipo}?idPeriodo=${idPeriodo}`, '_blank')}
                                  variante="borde"
                                  className="h-10 rounded-xl px-4 text-xs font-bold text-unt-primary hover:bg-unt-primary/10"
                                >
                                  <Printer className="mr-2 h-4 w-4" />
                                  Imprimir
                                </Boton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </main>
      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
