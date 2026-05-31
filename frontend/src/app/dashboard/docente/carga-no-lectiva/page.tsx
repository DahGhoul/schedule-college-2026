'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { periodosService } from '@/services/periodos.service';
import { cargaNoLectivaService, type SeccionNoLectivaKey } from '@/services/carga-no-lectiva.service';
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { ArrowLeft, CalendarDays, FileText, Save, Trash2, UserRound, Printer } from 'lucide-react';

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
  limite_preparacion_evaluacion: number;
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

const parseHoraMinutos = (hora: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(hora ?? '').trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return (hh * 60) + mm;
};





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

  const { data: periodosData } = useQuery({
    queryKey: ['periodos-carga-no-lectiva'],
    queryFn: () => periodosService.listar().then((res) => res.data),
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

    setHabilitaAdministracion(Boolean(declaracionData?.banderas?.habilita_actividades_administracion));

    setSecciones(nuevasSecciones);
    setErroresFormulario([]);
  }, [declaracionData, usuario]);

  const mutationGuardar = useMutation({
    mutationFn: (datos: any) => cargaNoLectivaService.guardarMiDeclaracion(idPeriodo, datos),
    onSuccess: async (response: any) => {
      setToast({ mensaje: 'Carga no lectiva guardada correctamente', tipo: 'exito' });
      await queryClient.invalidateQueries({ queryKey: ['mi-carga-no-lectiva', usuario?.idDocente, idPeriodo] });
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

  const guardarDeclaracion = () => {
    if (!usuario?.idDocente || !idPeriodo) return;

    const errores: string[] = [];
    const horasPreparacion = Number(secciones.PREPARACION_EVALUACION.horas || 0);
    const horasInvestigacion = Number(secciones.INVESTIGACION.horas || 0);

    if (reglas && horasPreparacion > Number(reglas.limite_preparacion_evaluacion || 0)) {
      errores.push(`Preparación y Evaluación no puede exceder ${formatearHoras(Number(reglas.limite_preparacion_evaluacion || 0))}h (50% de la carga lectiva).`);
    }

    const limiteInvestigacion = Number(reglas?.limites_fijos_por_seccion?.INVESTIGACION ?? 0);
    if (limiteInvestigacion > 0 && horasInvestigacion > limiteInvestigacion) {
      errores.push(`Investigación no puede exceder ${formatearHoras(limiteInvestigacion)}h.`);
    }

    const horasGobierno = Number(secciones.ACTIVIDADES_GOBIERNO.horas || 0);
    if (!habilitaGobierno && horasGobierno > 0) {
      errores.push('Para declarar Actividades de Gobierno debes marcar que tienes cargo por elección vigente.');
    }

    const horasAdministracion = Number(secciones.ACTIVIDADES_ADMINISTRACION.horas || 0);
    if (!habilitaAdministracion && horasAdministracion > 0) {
      errores.push('Para declarar Actividades de Administración debes marcar que tienes encargo/cargo de confianza vigente.');
    }

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
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#081e34] via-[#123b6d] to-[#0f4c81] p-8 text-white shadow-2xl relative">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
              Carga No Lectiva
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Registro de horas no lectivas</h1>
              <p className="text-sm text-white/80 sm:text-base">
                Selecciona tu semestre, completa tus datos si faltan y registra tus horas por sección. El trabajo lectivo se gestiona aparte.
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Período académico</p>
            <div className="mt-3">
              <Selector
                value={idPeriodo}
                onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
                className="mt-0 border-white/20 bg-white/95 text-slate-900 shadow-none focus:border-white focus:ring-white/30"
              >
                <option value={0}>-- Seleccionar período --</option>
                {periodos?.map((periodo: any) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.nombre}
                  </option>
                ))}
              </Selector>
            </div>
          </div>
        </div>
      </div>

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
      ) : (
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
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  9 secciones editables
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {SECCIONES.filter((seccion) => {
                    if (seccion.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) return false;
                    if (seccion.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion) return false;
                    return true;
                  }).map((seccion) => (
                    <div key={seccion.clave} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-sm">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-900">{seccion.titulo}</h3>
                          <p className="text-xs text-slate-500">{seccion.ayuda}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 lg:w-[26rem] lg:grid-cols-[110px_1fr]">
                          <CampoTexto
                            label="Horas"
                            type="number"
                            step="0.5"
                            min="0"
                            value={secciones[seccion.clave].horas}
                            onChange={(e) => manejarCambioSeccion(seccion.clave, 'horas', e.target.value)}
                            disabled={
                              (seccion.clave === 'ACTIVIDADES_GOBIERNO' && !habilitaGobierno) ||
                              (seccion.clave === 'ACTIVIDADES_ADMINISTRACION' && !habilitaAdministracion)
                            }
                            placeholder="0"
                          />
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
                          rows={3}
                          className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none hover:border-gray-300 disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="Describe brevemente la actividad desarrollada"
                        />
                      </div>
                    </div>
                  ))}
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
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={habilitaGobierno}
                      onChange={(e) => setHabilitaGobierno(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-unt-primary focus:ring-unt-primary"
                    />
                    <span>Tengo cargo por elección para declarar Actividades de Gobierno.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={habilitaAdministracion}
                      onChange={(e) => setHabilitaAdministracion(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-unt-primary focus:ring-unt-primary"
                    />
                    <span>Tengo encargatura/cargo de confianza para declarar Actividades de Administración.</span>
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
                        {(declaracionData?.formatos ?? [])
                          .filter((formato: any) => ['CARGA_HORARIA_CENTRAL', 'DECLARACION_JURADA_CENTRAL', 'DECLARACION_JURADA_DESCONCENTRADA'].includes(formato.tipo))
                          .map((formato: any) => (
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
                    disabled={cargandoDeclaracion}
                  >
                    <Save className="h-4 w-4" />
                    Guardar
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
      )}

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}