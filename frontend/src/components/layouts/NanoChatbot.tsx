'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, X, Send, Loader2, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { periodosService } from '@/services/periodos.service';
import { estadisticasService } from '@/services/estadisticas.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { ventanasService } from '@/services/ventanas.service';
import { docentesService } from '@/services/docentes.service';
import { ambientesService } from '@/services/ambientes.service';
import { horariosService } from '@/services/horarios.service';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { chatService } from '@/services/chat.service';
import { cn } from '@/lib/utilidades';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

type UserRole = 'ADMIN' | 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE';

interface Sugerencia {
  texto: string;
  consulta: string;
}

const DIAS_MAP: Record<string, string> = {
  lunes: 'LUNES', martes: 'MARTES', miercoles: 'MIERCOLES',
  jueves: 'JUEVES', viernes: 'VIERNES', sabado: 'SABADO', domingo: 'DOMINGO',
};

const DIAS_LABEL: Record<string, string> = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};

export const NanoChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola. Soy Nano, tu asistente virtual del sistema de horarios. ¿En qué puedo ayudarte?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { usuario } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const role = usuario?.rol as UserRole;

  const sugerencias = useMemo((): Sugerencia[] => {
    if (role === 'DOCENTE') return [
      { texto: 'Mis cursos', consulta: '¿Cuáles son mis cursos?' },
      { texto: 'Mis horas', consulta: '¿Cuántas horas tengo?' },
      { texto: 'Mi horario', consulta: '¿Dónde veo mi horario?' },
    ];
    if (role === 'SECRETARIA' || role === 'ADMIN') return [
      { texto: 'Docentes pendientes', consulta: '¿Qué docentes faltan cargar horario?' },
      { texto: 'Estado ventanas', consulta: 'Estado de las ventanas de atención' },
      { texto: 'Ambientes disponibles', consulta: '¿Qué ambientes están disponibles?' },
    ];
    if (role === 'DIRECTOR') return [
      { texto: 'Cursos del ciclo 1', consulta: 'Cursos del ciclo 1' },
      { texto: 'Cursos del ciclo 5', consulta: 'Cursos del ciclo 5' },
      { texto: 'Resumen general', consulta: 'Resumen general del periodo' },
    ];
    return [];
  }, [role]);

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.]/g, '')
      .trim();
  };

  const matchesKeywords = (text: string, keywords: string[]): boolean => {
    return keywords.some((keyword) => text.includes(keyword));
  };

  const getPeriodoActivo = async () => {
    const periodosRes = await periodosService.listar();
    const periodos = periodosRes.data || periodosRes;
    return periodos.find((p: any) => p.activo);
  };

  const buscarDocente = async (nombre: string): Promise<any | null> => {
    try {
      const res = await docentesService.buscar(nombre);
      const docentes = res.data || res;
      if (Array.isArray(docentes) && docentes.length > 0) {
        return docentes[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  const consultarGemini = async (text: string): Promise<string | null> => {
    try {
      const res = await chatService.consultar({ consulta: text, rol: role });
      if (res.data?.respuesta) return res.data.respuesta;
      return null;
    } catch {
      return null;
    }
  };

  const formatBloquesHorario = (bloques: any[]): string => {
    const sorted = [...bloques].sort((a, b) => {
      const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
      const diaDiff = dias.indexOf(a.dia) - dias.indexOf(b.dia);
      if (diaDiff !== 0) return diaDiff;
      return (a.horaInicio || '').localeCompare(b.horaInicio || '');
    });

    return sorted.map((b: any) => {
      const dia = DIAS_LABEL[b.dia] || b.dia;
      const horaInicio = b.horaInicio ? b.horaInicio.slice(0, 5) : '--:--';
      const horaFin = b.horaFin ? b.horaFin.slice(0, 5) : '--:--';
      const curso = b.cursoNombre || b.curso?.nombre || 'Curso';
      const codigo = b.cursoCodigo || b.curso?.codigo || '';
      const aula = b.ambienteNombre || b.ambiente?.nombre || '';
      return `- ${dia} ${horaInicio}-${horaFin} | ${codigo ? codigo + ' ' : ''}${curso}${aula ? ' (' + aula + ')' : ''}`;
    }).join('\n');
  };

  const extractDocenteName = (text: string): string | null => {
    const patterns = [
      /(?:horario|clases|pdf|descargar|enviar|horario del?)\s+(?:docente\s+)?(.+)/,
      /(?:que dias trabaja|que dias tiene|cuando trabaja|dias de clase del?)\s+(?:docente\s+)?(.+)/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }
    return null;
  };

  // ============ DOCENTE QUERY HANDLERS ============

  const handleDocenteQuery = async (text: string): Promise<string> => {
    const idDocente = usuario?.idDocente;
    if (!idDocente) {
      return 'No puedo encontrar tu información como docente en el sistema.';
    }

    if (matchesKeywords(text, ['horario', 'mi horario', 'ver horario', 'cual es mi horario', 'ver mi horario'])) {
      return 'Para consultar tu horario personal, accede a la sección Horarios > Mi Horario en el menú lateral del sistema.';
    }

    if (matchesKeywords(text, ['curso', 'cursos', 'asignado', 'asignados', 'mis curso', 'mis cursos', 'que cursos', 'cuales son mis cursos', 'dame mis cursos'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        if (!periodoActivo) return 'No hay un periodo académico activo actualmente.';

        const resumen = await estadisticasService.resumenDocente(idDocente, periodoActivo.id);
        const componentes = resumen.data?.componentes || [];

        if (componentes.length === 0) {
          return 'Actualmente no tienes cursos asignados en el periodo activo.';
        }

        const cursos = componentes.map((c: any) => {
          const cursoCodigo = c.cursoCodigo || '';
          const cursoNombre = c.nombreCurso || 'Curso sin nombre';
          const componente = c.tipoComponente || 'Componente';
          return `- ${cursoCodigo ? cursoCodigo + ': ' : ''}${cursoNombre} (${componente}) - ${c.horasAsignadas}h/sem`;
        }).join('\n');

        return `Tus cursos asignados en el periodo activo son:\n${cursos}`;
      } catch (err) {
        console.error('Error loading courses:', err);
        return 'No pude cargar tus cursos asignados. Por favor, verifica más tarde.';
      }
    }

    if (matchesKeywords(text, ['hora', 'horas', 'lectiva', 'lectivas', 'cuantas horas', 'cuantas hora', 'total horas', 'horas totales', 'carga horaria', 'mi carga'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        if (!periodoActivo) return 'No hay un periodo académico activo actualmente.';

        const resumen = await estadisticasService.resumenDocente(idDocente, periodoActivo.id);
        const totalHoras = resumen.data?.horasLectivas || 0;
        const horasMax = resumen.data?.horasMaximas || 40;
        const porcentaje = Math.round((totalHoras / horasMax) * 100);

        return `En el periodo activo tienes asignadas ${totalHoras} horas lectivas de ${horasMax} horas máximas (${porcentaje}% de tu carga).`;
      } catch (err) {
        console.error('Error loading hours:', err);
        return 'No pude cargar tu información de horas lectivas.';
      }
    }

    return '__GENERIC_FALLBACK__Como docente, puedo ayudarte a consultar tus cursos asignados, tus horas lectivas y cómo acceder a tu horario personal. ¿Qué necesitas saber?';
  };

  // ============ SECRETARIA QUERY HANDLERS ============

  const handleDocenteSchedule = async (text: string): Promise<string | null> => {
    const name = extractDocenteName(text);
    if (!name) return null;

    const docente = await buscarDocente(name);
    if (!docente) return null;

    const periodoActivo = await getPeriodoActivo();
    if (!periodoActivo) return `No se pudo encontrar información del docente "${name}" en el periodo activo.`;

    try {
      const res = await horariosService.obtenerSeleccionesTemporales(docente.id);
      const bloques = res.data || res;
      if (!Array.isArray(bloques) || bloques.length === 0) {
        return `El docente ${docente.apellidos}, ${docente.nombres} no tiene horario cargado actualmente.`;
      }
      const bloquesTexto = formatBloquesHorario(bloques);
      return `Horario de ${docente.apellidos}, ${docente.nombres}:\n${bloquesTexto}`;
    } catch {
      return `No se pudo obtener el horario del docente ${docente.apellidos}, ${docente.nombres}.`;
    }
  };

  const handleDocenteScheduleByDay = async (text: string): Promise<string | null> => {
    const diaEncontrado = Object.keys(DIAS_MAP).find((d) => text.includes(d));
    if (!diaEncontrado) return null;

    const name = extractDocenteName(text);
    if (!name) return null;

    const docente = await buscarDocente(name);
    if (!docente) return null;

    const periodoActivo = await getPeriodoActivo();
    if (!periodoActivo) return 'No se pudo obtener información del periodo activo.';

    try {
      const res = await horariosService.obtenerSeleccionesTemporales(docente.id);
      const bloques = res.data || res;
      if (!Array.isArray(bloques) || bloques.length === 0) {
        return `El docente ${docente.apellidos}, ${docente.nombres} no tiene horario cargado.`;
      }

      const dia = DIAS_MAP[diaEncontrado];
      const bloquesDia = bloques.filter((b: any) => b.dia === dia);
      if (bloquesDia.length === 0) {
        return `El docente ${docente.apellidos}, ${docente.nombres} no tiene clases el ${diaEncontrado}.`;
      }

      const bloquesTexto = formatBloquesHorario(bloquesDia);
      return `Clases de ${docente.apellidos}, ${docente.nombres} el ${diaEncontrado}:\n${bloquesTexto}`;
    } catch {
      return 'No se pudo obtener la información de clases.';
    }
  };

  const handleDocentePdf = async (text: string): Promise<string | null> => {
    const name = extractDocenteName(text);
    if (!name && !text.includes('todos') && !text.includes('global')) return null;

    const periodoActivo = await getPeriodoActivo();
    if (!periodoActivo) return 'No hay un periodo activo.';

    if (text.includes('todos') || text.includes('global')) {
      try {
        const res = await reportesService.pdfGlobal(periodoActivo.id);
        descargarBlob(res.data, `horarios-global-${periodoActivo.nombre}.pdf`);
        return 'Descargando el reporte PDF global de todos los horarios.';
      } catch {
        return 'No se pudo generar el reporte PDF global.';
      }
    }

    const docente = await buscarDocente(name!);
    if (!docente) return `No se encontró un docente con el nombre "${name}".`;

    try {
      const res = await reportesService.pdfDocente(docente.id, periodoActivo.id);
      const nombreArchivo = `horario-${docente.apellidos}-${docente.nombres}.pdf`.replace(/\s+/g, '-');
      descargarBlob(res.data, nombreArchivo);
      return `Descargando el horario de ${docente.apellidos}, ${docente.nombres} en PDF.`;
    } catch {
      return `No se pudo generar el PDF para ${docente.apellidos}, ${docente.nombres}.`;
    }
  };

  const handleAmbientesDisponibles = async (): Promise<string> => {
    const periodoActivo = await getPeriodoActivo();
    if (!periodoActivo) return 'No hay un periodo activo.';

    try {
      const res = await ambientesService.disponibilidadGeneral(periodoActivo.id);
      const ambientes = res.data || res;
      if (!Array.isArray(ambientes) || ambientes.length === 0) {
        return 'No se encontraron ambientes registrados en el sistema.';
      }

      return `Información de ambientes:\n${ambientes.map((a: any) => {
        const nombre = a.nombre || a.ambiente?.nombre || `Ambiente #${a.id}`;
        const capacidad = a.capacidad || a.ambiente?.capacidad || '?';
        const ocupado = a.ocupado ? ' (ocupado)' : ' (disponible)';
        return `- ${nombre} (${capacidad} pers.)${ocupado}`;
      }).join('\n')}`;
    } catch {
      return 'No se pudo cargar la información de ambientes.';
    }
  };

  const handleSecretariaQuery = async (text: string): Promise<string> => {
    if (matchesKeywords(text, ['horario de', 'horario del', 'clases de', 'clases del', 'horario docente'])) {
      const result = await handleDocenteSchedule(text);
      if (result) return result;
    }

    const dayResult = await handleDocenteScheduleByDay(text);
    if (dayResult) return dayResult;

    if (matchesKeywords(text, ['pdf de', 'pdf del', 'descargar horario', 'enviar horario'])) {
      const result = await handleDocentePdf(text);
      if (result) return result;
    }

    if (matchesKeywords(text, ['ambiente disponible', 'ambiente libre', 'aula libre', 'aula disponible', 'laboratorio disponible', 'que ambientes'])) {
      return await handleAmbientesDisponibles();
    }

    if (matchesKeywords(text, ['falta', 'faltan', 'pendiente', 'pendientes', 'cargar horario', 'sin cargar', 'docentes pendientes', 'quien falta'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        const ventanas = await ventanasService.listar(periodoActivo?.id);
        const ventanasList = Array.isArray(ventanas) ? ventanas : ventanas.data || [];
        const pendientes = ventanasList.filter((v: any) => v.estado !== 'COMPLETADA');

        if (pendientes.length === 0) {
          return 'Excelente. Todos los docentes han completado su carga horaria en las ventanas de atención.';
        }

        const nombresPendientes = pendientes.flatMap((v: any) =>
          (v.atenciones || []).map((a: any) => {
            if (a.docente) return `- ${a.docente.apellidos}, ${a.docente.nombres}`;
            return `- Docente ID: ${a.id_docente || '?'}`;
          })
        ).join('\n');

        return `Los docentes que aún no han completado su horario son:\n${nombresPendientes}`;
      } catch (err) {
        console.error('Error loading windows:', err);
        return 'No pude cargar la información de las ventanas de atención.';
      }
    }

    if (matchesKeywords(text, ['ventana', 'ventanas', 'ventana de atencion', 'ventanas de atencion', 'estado de las ventanas'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        if (!periodoActivo) return 'No hay un periodo académico activo actualmente.';

        const ventanas = await ventanasService.listar(periodoActivo.id);
        const ventanasList = Array.isArray(ventanas) ? ventanas : ventanas.data || [];

        if (ventanasList.length === 0) {
          return 'No hay ventanas de atención configuradas para el periodo activo.';
        }

        const resumenVentanas = ventanasList.map((v: any) => {
          const estado = v.estado === 'COMPLETADA' ? 'Completada' :
                        v.estado === 'ACTIVA' ? 'Activa' :
                        v.estado === 'PENDIENTE' ? 'Pendiente' : v.estado;
          return `- Ventana ${v.id}: ${estado}`;
        }).join('\n');

        return `Estado de las ventanas de atención del periodo activo:\n${resumenVentanas}`;
      } catch {
        return 'No pude cargar la información de las ventanas de atención.';
      }
    }

    return '__GENERIC_FALLBACK__Como secretaria, puedo ayudarte a consultar los docentes pendientes de cargar horario, el estado de las ventanas de atención, el horario de un docente específico y los ambientes disponibles. ¿Qué necesitas?';
  };

  // ============ DIRECTOR QUERY HANDLERS ============

  const handleDirectorQuery = async (text: string): Promise<string> => {
    if (matchesKeywords(text, ['ciclo', 'cursos del ciclo', 'cursos por ciclo', 'cuales son los cursos del ciclo', 'dame los cursos del ciclo'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        if (!periodoActivo) return 'No hay un periodo académico activo actualmente.';

        const ciclos = await periodosService.obtenerCiclosActivo();
        const ciclosList = ciclos.data || ciclos;

        if (ciclosList.length === 0) {
          return 'No hay ciclos disponibles para el periodo activo.';
        }

        let cicloSeleccionado = null;
        for (let i = 1; i <= 10; i++) {
          if (text.includes(`ciclo ${i}`) || text.includes(`${i} ciclo`)) {
            cicloSeleccionado = ciclosList.find((c: any) => c.numero === i);
            break;
          }
        }

        if (!cicloSeleccionado) {
          const ciclosDisponibles = ciclosList.map((c: any) => `Ciclo ${c.numero}`).join(', ');
          return `¿De qué ciclo quieres conocer los cursos? Los ciclos disponibles son: ${ciclosDisponibles}. Por favor, menciona el número del ciclo.`;
        }

        const cursosPorCiclo = await cargaHorariaService.obtenerCursosPorCiclo(periodoActivo.id, cicloSeleccionado.id);
        const cursosList = cursosPorCiclo.data || cursosPorCiclo;

        if (cursosList.length === 0) {
          return `No hay cursos asignados al Ciclo ${cicloSeleccionado.numero} en el periodo activo.`;
        }

        const nombresCursos = cursosList.map((c: any) => {
          const codigo = c.curso?.codigo || c.cursoCodigo || '';
          const nombre = c.curso?.nombre || c.cursoNombre || 'Curso sin nombre';
          return `- ${codigo ? codigo + ': ' : ''}${nombre}`;
        }).join('\n');

        return `Cursos del Ciclo ${cicloSeleccionado.numero}:\n${nombresCursos}`;
      } catch (err) {
        console.error('Error loading courses by cycle:', err);
        return 'No pude cargar la información de los cursos por ciclo.';
      }
    }

    if (matchesKeywords(text, ['resumen', 'resumen general', 'estado general', 'como va el periodo', 'status del periodo', 'informacion general'])) {
      try {
        const periodoActivo = await getPeriodoActivo();
        if (!periodoActivo) return 'No hay un periodo académico activo actualmente.';

        const ciclos = await periodosService.obtenerCiclosActivo();
        const ciclosList = ciclos.data || ciclos;

        const resumen = await estadisticasService.resumen(periodoActivo.id);
        const totalDocentes = resumen.data?.totalDocentes || 0;
        const totalCursos = resumen.data?.totalCursos || 0;

        return `Resumen general del periodo activo (${periodoActivo.nombre}):
- Total de ciclos: ${ciclosList.length}
- Total de docentes: ${totalDocentes}
- Total de cursos: ${totalCursos}`;
      } catch {
        return 'No pude cargar el resumen general del periodo.';
      }
    }

    return '__GENERIC_FALLBACK__Como director, puedo ayudarte a consultar los cursos por ciclo y el resumen general del periodo académico. ¿Qué necesitas?';
  };

  // ============ MAIN PROCESSING ============

  const processMessage = async (userText: string) => {
    const normalizedText = normalizeText(userText);
    let response = '';

    try {
      if (role === 'DOCENTE') {
        response = await handleDocenteQuery(normalizedText);
      } else if (role === 'SECRETARIA' || role === 'ADMIN') {
        response = await handleSecretariaQuery(normalizedText);
      } else if (role === 'DIRECTOR') {
        response = await handleDirectorQuery(normalizedText);
      } else {
        response = 'No puedo identificar tu rol en el sistema. Por favor, inicia sesión nuevamente.';
      }

      if (response.startsWith('__GENERIC_FALLBACK__')) {
        const geminiResponse = await consultarGemini(normalizedText);
        if (geminiResponse) {
          response = geminiResponse;
        } else {
          response = response.replace('__GENERIC_FALLBACK__', '');
        }
      }
    } catch (err) {
      console.error('Error processing query:', err);
      response = 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente más tarde.';
    }

    return response;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: 'assistant', content: '', isLoading: true },
    ]);

    try {
      const response = await processMessage(text);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: response, isLoading: false }
            : msg
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: 'Lo siento, ocurrió un error. Por favor, intenta nuevamente.', isLoading: false }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSugerenciaClick = (consulta: string) => {
    sendMessage(consulta);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group"
      >
        {isOpen ? (
          <X className="w-8 h-8 transition-transform duration-300" />
        ) : (
          <div className="relative">
            <Bot className="w-8 h-8 transition-transform duration-300 group-hover:rotate-12" />
            <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[420px] max-w-[92vw] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Bot className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Nano</h3>
                <p className="text-white/70 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Asistente virtual
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                      : 'bg-gradient-to-br from-[#0b1f3a] to-[#0f4c81]'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    'p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-tr-sm'
                      : 'bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-100'
                  )}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {sugerencias.length > 0 && (
            <div className="px-4 pb-2 pt-2 bg-white border-t border-gray-100">
              <div className="flex flex-wrap gap-1.5">
                {sugerencias.map((s) => (
                  <button
                    key={s.texto}
                    type="button"
                    onClick={() => handleSugerenciaClick(s.consulta)}
                    className="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                  >
                    {s.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-100"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu consulta..."
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="p-3 rounded-2xl bg-gradient-to-br from-[#0b1f3a] to-[#0f4c81] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 transition-all"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
