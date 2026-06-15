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
  const [erroresFormulario, setErroresFormulario] = useState<string[]>([]);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const [pestanaActiva, setPestanaActiva] = useState<'declaracion' | 'calendario'>('declaracion');
  const [seccionesVisibles, setSeccionesVisibles] = useState<SeccionNoLectivaKey[]>(['PREPARACION_EVALUACION']);
  const [nuevaSeccionClave, setNuevaSeccionClave] = useState<string>('');

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
    
    // Auto-populate visible sections
    const visibles: SeccionNoLectivaKey[] = ['PREPARACION_EVALUACION'];
    Object.entries(nuevasSecciones).forEach(([clave, valor]) => {
      if (clave !== 'PREPARACION_EVALUACION' && (Number(valor.horas) > 0 || valor.codigo_resolucion || valor.descripcion)) {
        if (!visibles.includes(clave as SeccionNoLectivaKey)) {
          visibles.push(clave as SeccionNoLectivaKey);
        }
      }
    });
    setSeccionesVisibles(visibles);
    
    setErroresFormulario([]);
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

    const horasInvestigacion = Number(secciones.INVESTIGACION.horas || 0);
    const limiteInvestigacion = Number(reglas.limites_fijos_por_seccion?.INVESTIGACION ?? 0);
    if (limiteInvestigacion > 0 && horasInvestigacion > limiteInvestigacion) {
      nuevosErrores.INVESTIGACION = `Máximo permitido: ${formatearHoras(limiteInvestigacion)}h.`;
    }

    const horasTesis = Number(secciones.ASESORIA_TESIS.horas || 0);
    const limiteTesis = Number(reglas.limites_fijos_por_seccion?.ASESORIA_TESIS ?? 0);
    if (limiteTesis > 0 && horasTesis > limiteTesis) {
      nuevosErrores.ASESORIA_TESIS = `Máximo permitido: ${formatearHoras(limiteTesis)}h.`;
    }

    const horasGobierno = Number(secciones.ACTIVIDADES_GOBIERNO.horas || 0);
    if (!habilitaGobierno && horasGobierno > 0) {
      nuevosErrores.ACTIVIDADES_GOBIERNO = 'Requiere cargo por elección marcado.';
    }

    const horasAdministracion = Number(secciones.ACTIVIDADES_ADMINISTRACION.horas || 0);
    if (!habilitaAdministracion && horasAdministracion > 0) {
      nuevosErrores.ACTIVIDADES_ADMINISTRACION = 'Requiere encargatura marcada.';
    }

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
      setErroresFormulario([]);
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
    setSecciones((actual) => ({
      ...actual,
      [clave]: {
        ...actual[clave],
        [campo]: valor,
      },
    }));
  };

  const manejarEliminarSeccion = (clave: SeccionNoLectivaKey) => {
    manejarCambioSeccion(clave, 'horas', '0');
    manejarCambioSeccion(clave, 'codigo_resolucion', '');
    manejarCambioSeccion(clave, 'descripcion', '');
    setSeccionesVisibles(prev => prev.filter(c => c !== clave));
  };

  const handleCeldaClick = (diaSemana: string, horaInicio: string) => {
    if (!seccionActiva) {
      setToast({ mensaje: 'Primero seleccione una sección (Pincel) de la lista inferior', tipo: 'error' });
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
    console.log("RESTRICCIONES DATA", restricciones, resActivas);

    if (resActivas) {
      if (resActivas.franjaInicio) inicio = parseInt(resActivas.franjaInicio.split(':')[0]);
      if (resActivas.franjaFin) fin = parseInt(resActivas.franjaFin.split(':')[0]);
      if (resActivas.bloqueoAlmuerzoInicio) almuerzoInicio = parseInt(resActivas.bloqueoAlmuerzoInicio.split(':')[0]);
      if (resActivas.bloqueoAlmuerzoFin) almuerzoFin = parseInt(resActivas.bloqueoAlmuerzoFin.split(':')[0]);
    }
    console.log("PARSED HOURS", { inicio, fin, almuerzoInicio, almuerzoFin });

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

    const errores: string[] = [];

    if (reglas && Math.abs(horasTotales - horasObjetivo) > 0.01) {
      errores.push(`La carga total debe completar ${formatearHoras(horasObjetivo)}h. Actualmente tienes ${formatearHoras(horasTotales)}h (lectiva + no lectiva).`);
    }

    if (errores.length > 0) {
      setErroresFormulario(errores);
      setToast({ mensaje: 'Revisa las validaciones antes de guardar', tipo: 'error' });
      return;
    }

    setErroresFormulario([]);

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
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#081e34] via-[#123b6d] to-[#0f4c81] pt-4 pb-2 text-white shadow-2xl relative">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none" />
        
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 pb-6 pt-4 sm:flex-row sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/docente')} className="rounded-full p-2 text-white hover:bg-white/20 transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Declaración Jurada y Calendario No Lectivo</h1>
              <p className="text-sm text-blue-100">Distribuye tus horas no lectivas para el período {periodos?.find((p: any) => p.id === idPeriodo)?.nombre || 'actual'}</p>
            </div>
          </div>
        </div>

        {/* Navegación de Pestañas */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex bg-white/10 rounded-2xl p-1 backdrop-blur-sm w-fit shadow-inner">
            <button 
              onClick={() => setPestanaActiva('declaracion')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                pestanaActiva === 'declaracion' ? "bg-white text-unt-primary shadow-md scale-105" : "text-white hover:bg-white/20"
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
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                pestanaActiva === 'calendario' ? "bg-white text-unt-primary shadow-md scale-105" : "text-white hover:bg-white/20",
                !declaracionData?.declaracion?.id ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              <CalendarDays className="h-4 w-4" />
              2. Calendario de Distribución
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/80">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <UserRound className="h-5 w-5 text-unt-primary" />
                    Datos del docente
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <FileText className="h-5 w-5 text-unt-primary" />
                    Secciones no lectivas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {seccionesVisibles.map((clave) => {
                      const seccion = SECCIONES.find(s => s.clave === clave);
                      if (!seccion) return null;
                      return (
                      <div key={seccion.clave} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-sm relative group">
                        {seccion.clave !== 'PREPARACION_EVALUACION' && (
                          <button 
                            onClick={() => manejarEliminarSeccion(seccion.clave)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors shadow-sm"
                            title="Quitar sección"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between pr-8">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-900">{seccion.titulo}</h3>
                            <p className="text-xs text-slate-500">{seccion.ayuda}</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 lg:w-[26rem] lg:grid-cols-[110px_1fr]">
                            <div className="relative">
                              <CampoTexto
                                label="Horas (Enteros)"
                                type="number"
                                step="1"
                                min="0"
                                value={secciones[seccion.clave].horas}
                                onChange={(e) => manejarCambioSeccion(seccion.clave, 'horas', e.target.value)}
                                disabled={
                                  (seccion.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) ||
                                  (seccion.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion)
                                }
                                placeholder="0"
                                className={erroresSecciones[seccion.clave] ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50' : ''}
                              />
                              {erroresSecciones[seccion.clave] && (
                                <p className="absolute -bottom-5 left-1 text-[10px] font-bold text-red-600 truncate max-w-full" title={erroresSecciones[seccion.clave]}>
                                  {erroresSecciones[seccion.clave]}
                                </p>
                              )}
                            </div>
                            <CampoTexto
                              label="Código resolución"
                              value={secciones[seccion.clave].codigo_resolucion}
                              onChange={(e) => manejarCambioSeccion(seccion.clave, 'codigo_resolucion', e.target.value)}
                              disabled={
                                (seccion.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) ||
                                (seccion.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion)
                              }
                              placeholder="Opcional"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="mb-1.5 block text-sm font-bold text-gray-700 ml-1">Descripción</label>
                          <textarea
                            value={secciones[seccion.clave].descripcion}
                            onChange={(e) => manejarCambioSeccion(seccion.clave, 'descripcion', e.target.value)}
                            disabled={
                              (seccion.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) ||
                              (seccion.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion)
                            }
                            placeholder="Descripción detallada de las actividades..."
                            rows={2}
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:border-unt-primary focus:outline-none focus:ring-2 focus:ring-unt-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                          />
                        </div>
                      </div>
                    )})}
                  </div>

                  {/* Agregar nueva sección dinámica */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100 pt-6">
                    <div className="flex-1 w-full">
                      <Selector
                        label=""
                        value={nuevaSeccionClave}
                        onChange={(e) => setNuevaSeccionClave(e.target.value)}
                        className="w-full"
                      >
                        <option value="">Selecciona una sección opcional para agregar...</option>
                        {SECCIONES.filter(s => 
                          !seccionesVisibles.includes(s.clave) && 
                          !(s.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) &&
                          !(s.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion)
                        ).map(s => (
                          <option key={s.clave} value={s.clave}>{s.titulo}</option>
                        ))}
                      </Selector>
                    </div>
                    <Boton 
                      type="button" 
                      variante="secundario"
                      onClick={() => {
                        if (nuevaSeccionClave && !seccionesVisibles.includes(nuevaSeccionClave as SeccionNoLectivaKey)) {
                          setSeccionesVisibles(prev => [...prev, nuevaSeccionClave as SeccionNoLectivaKey]);
                          setNuevaSeccionClave('');
                        }
                      }}
                      disabled={!nuevaSeccionClave}
                      className="whitespace-nowrap rounded-xl mt-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Sección
                    </Boton>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/80">
                  <CardTitle className="flex items-center gap-2 text-slate-900">Detalle de carga lectiva asignada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                          <th className="py-2 pr-4 font-semibold">Código</th>
                          <th className="py-2 pr-4 font-semibold">Curso</th>
                          <th className="py-2 pr-4 font-semibold">Ciclo</th>
                          <th className="py-2 pr-4 font-semibold">Componente</th>
                          <th className="py-2 pr-4 font-semibold">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(declaracionData?.carga_lectiva ?? []).map((fila: any, index: number) => (
                          <tr key={`${fila.curso_codigo}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2 pr-4">{fila.curso_codigo}</td>
                            <td className="py-2 pr-4">{fila.curso_nombre}</td>
                            <td className="py-2 pr-4">{fila.ciclo}</td>
                            <td className="py-2 pr-4">{fila.componente}</td>
                            <td className="py-2 pr-4">{formatearHoras(Number(fila.horas ?? 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden sticky top-6">
                <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Save className="h-5 w-5" />
                    Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Total horas no lectivas</p>
                    <p className="mt-2 text-4xl font-extrabold text-slate-900">{formatearHoras(totalHoras)}</p>
                    <p className="mt-1 text-sm text-slate-500">Suma automática de todas las secciones.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Validación de jornada</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Carga lectiva:</span> {formatearHoras(horasLectivas)}h</p>
                      <p><span className="font-semibold text-slate-900">Carga no lectiva:</span> {formatearHoras(totalHoras)}h</p>
                      <p><span className="font-semibold text-slate-900">Carga total:</span> {formatearHoras(horasTotales)}h</p>
                      <p><span className="font-semibold text-slate-900">Objetivo por dedicación:</span> {formatearHoras(horasObjetivo)}h</p>
                    </div>
                    {horasObjetivo > 0 && (
                      <p className={`mt-3 text-xs font-semibold ${Math.abs(horasTotales - horasObjetivo) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Math.abs(horasTotales - horasObjetivo) < 0.01
                          ? 'La jornada está completa según dedicación.'
                          : `Faltan o sobran ${formatearHoras(Math.abs(horasObjetivo - horasTotales))}h para completar la jornada.`}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cargos y habilitaciones</p>
                    <label className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <input
                        type="checkbox"
                        checked={habilitaGobierno}
                        onChange={(e) => setHabilitaGobierno(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-unt-primary focus:ring-unt-primary"
                      />
                      <div>
                        <span className="font-semibold block">Tengo cargo por elección para declarar Actividades de Gobierno.</span>
                        <span className="text-xs text-slate-500">Nota: Al marcarlo como declaración jurada, esta habilitación será visible para la Secretaría y autoridades pertinentes.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <input
                        type="checkbox"
                        checked={habilitaAdministracion}
                        onChange={(e) => setHabilitaAdministracion(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-unt-primary focus:ring-unt-primary"
                      />
                      <div>
                        <span className="font-semibold block">Tengo encargatura/cargo de confianza para declarar Actividades de Administración.</span>
                        <span className="text-xs text-slate-500">Nota: Al marcarlo como declaración jurada, esta habilitación será visible para la Secretaría y autoridades pertinentes.</span>
                      </div>
                    </label>
                  </div>

                  {erroresFormulario.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Validaciones pendientes</p>
                      <ul className="mt-2 space-y-1 text-sm text-red-700">
                        {erroresFormulario.map((error, index) => (
                          <li key={`${error}-${index}`}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Datos guardados</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Periodo:</span> {periodos.find((p: any) => p.id === idPeriodo)?.nombre || idPeriodo}</p>
                      <p><span className="font-semibold text-slate-900">IBM:</span> {docente.codigo_ibm || 'Pendiente'}</p>
                      <p><span className="font-semibold text-slate-900">Condición:</span> {docente.modalidad}</p>
                      <p><span className="font-semibold text-slate-900">Categoría:</span> {docente.categoria}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Formatos automáticos</p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-slate-700">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                            <th className="py-2 pr-4 font-semibold">Formato</th>
                            <th className="py-2 pr-4 font-semibold">Sede</th>
                            <th className="py-2 pr-4 font-semibold">Estado</th>
                            <th className="py-2 pr-4 font-semibold text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(declaracionData?.formatos ?? []).map((formato: any) => (
                            <tr key={formato.tipo} className="border-b border-slate-100 last:border-b-0">
                              <td className="py-2 pr-4">{formato.etiqueta}</td>
                              <td className="py-2 pr-4">{formato.sede}</td>
                              <td className="py-2 pr-4">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${formato.estado === 'GENERADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {formato.estado}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-right">
                                <Boton
                                  onClick={() => window.open(`/imprimir/formatos/${formato.tipo}?idPeriodo=${idPeriodo}`, '_blank')}
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs font-bold text-unt-primary hover:bg-unt-primary/10"
                                >
                                  <Printer className="mr-2 h-3.5 w-3.5" />
                                  Imprimir
                                </Boton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Boton
                      onClick={guardarDeclaracion}
                      className="w-full justify-center gap-2 rounded-2xl bg-unt-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-unt-primary/20 hover:bg-[#002244]"
                      cargando={mutationGuardar.isPending}
                      disabled={cargandoDeclaracion || Object.keys(erroresSecciones).length > 0 || erroresFormulario.length > 0}
                    >
                      <Save className="h-4 w-4" />
                      Guardar y Continuar a Calendario
                    </Boton>
                    <Boton
                      variante="borde"
                      onClick={() => router.push('/dashboard/docente')}
                      className="w-full justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver
                    </Boton>
                    <Boton
                      variante="peligro"
                      onClick={() => {
                        if (confirm('¿Desea eliminar la declaración no lectiva de este período?')) {
                          mutationEliminar.mutate();
                        }
                      }}
                      className="w-full justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold"
                      disabled={!declaracionData?.declaracion}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar declaración
                    </Boton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-md" id="paso2">
              <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <CalendarDays className="h-6 w-6" />
                  Paso 2: Distribución de Horario No Lectivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-10">
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
                                'flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 w-full',
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
                      className="px-8 py-6 text-base rounded-2xl shadow-lg shadow-unt-primary/20 hover:scale-[1.02] transition-transform"
                    >
                      <Save className="h-5 w-5" />
                      Guardar Horario No Lectivo
                    </Boton>
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