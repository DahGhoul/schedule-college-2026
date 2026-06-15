'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { periodosService } from '@/services/periodos.service';
import { estadisticasService } from '@/services/estadisticas.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { ventanasService } from '@/services/ventanas.service';
import { cn } from '@/lib/utilidades';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

type UserRole = 'ADMIN' | 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE';

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

  // Helper to clean and normalize text for Spanish NLP
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.]/g, '')
      .trim();
  };

  // Helper to check if text matches any of the keywords
  const matchesKeywords = (text: string, keywords: string[]): boolean => {
    return keywords.some((keyword) => text.includes(keyword));
  };

  // Process user message and generate response
  const processMessage = async (userText: string) => {
    const normalizedText = normalizeText(userText);
    const role = usuario?.rol as UserRole;
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
    } catch (err) {
      console.error('Error processing query:', err);
      response = 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente más tarde.';
    }

    return response;
  };

  // Handle queries for DOCENTE role
  const handleDocenteQuery = async (text: string): Promise<string> => {
    const idDocente = usuario?.idDocente;
    if (!idDocente) {
      return 'No puedo encontrar tu información como docente en el sistema.';
    }

    // Horario personal
    if (matchesKeywords(text, ['horario', 'mi horario', 'ver horario', 'cual es mi horario', 'ver mi horario'])) {
      return 'Para consultar tu horario personal, accede a la sección Horarios > Mi Horario en el menú lateral del sistema.';
    }

    // Cursos asignados
    if (matchesKeywords(text, ['curso', 'cursos', 'asignado', 'asignados', 'mis curso', 'mis cursos', 'que cursos', 'cuales son mis cursos', 'dame mis cursos'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        if (!periodoActivo) {
          return 'No hay un periodo académico activo actualmente.';
        }

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

    // Horas lectivas
    if (matchesKeywords(text, ['hora', 'horas', 'lectiva', 'lectivas', 'cuantas horas', 'cuantas hora', 'total horas', 'horas totales', 'carga horaria', 'mi carga'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        if (!periodoActivo) {
          return 'No hay un periodo académico activo actualmente.';
        }

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

    return 'Como docente, puedo ayudarte a consultar tus cursos asignados, tus horas lectivas y cómo acceder a tu horario personal. ¿Qué necesitas saber?';
  };

  // Handle queries for SECRETARIA role
  const handleSecretariaQuery = async (text: string): Promise<string> => {
    // Docentes pendientes de horario
    if (matchesKeywords(text, ['falta', 'faltan', 'pendiente', 'pendientes', 'cargar horario', 'sin cargar', 'docentes pendientes', 'quien falta'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        const ventanas = await ventanasService.listar(periodoActivo?.id);
        const ventanasList = Array.isArray(ventanas) ? ventanas : ventanas.data || [];
        const pendientes = ventanasList.filter((v: any) => v.estado !== 'COMPLETADA');

        if (pendientes.length === 0) {
          return 'Excelente. Todos los docentes han completado su carga horaria en las ventanas de atención.';
        }

        const nombresPendientes = pendientes.map((v: any) => {
          const nombreCompleto = v.docente 
            ? `${v.docente.apellidos}, ${v.docente.nombres}` 
            : `Docente ID: ${v.id_docente}`;
          return `- ${nombreCompleto}`;
        }).join('\n');

        return `Los docentes que aún no han completado su horario son:\n${nombresPendientes}`;
      } catch (err) {
        console.error('Error loading windows:', err);
        return 'No pude cargar la información de las ventanas de atención.';
      }
    }

    // Ventanas de atención
    if (matchesKeywords(text, ['ventana', 'ventanas', 'ventana de atencion', 'ventanas de atencion', 'estado de las ventanas'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        if (!periodoActivo) {
          return 'No hay un periodo académico activo actualmente.';
        }

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

    return 'Como secretaria, puedo ayudarte a consultar los docentes pendientes de cargar horario y el estado de las ventanas de atención. ¿Qué necesitas?';
  };

  // Handle queries for DIRECTOR role
  const handleDirectorQuery = async (text: string): Promise<string> => {
    // Cursos por ciclo
    if (matchesKeywords(text, ['ciclo', 'cursos del ciclo', 'cursos por ciclo', 'cuales son los cursos del ciclo', 'dame los cursos del ciclo'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        if (!periodoActivo) {
          return 'No hay un periodo académico activo actualmente.';
        }

        const ciclos = await periodosService.obtenerCiclosActivo();
        const ciclosList = ciclos.data || ciclos;

        if (ciclosList.length === 0) {
          return 'No hay ciclos disponibles para el periodo activo.';
        }

        // Find cycle number from query
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

    // Resumen general
    if (matchesKeywords(text, ['resumen', 'resumen general', 'estado general', 'como va el periodo', 'status del periodo', 'informacion general'])) {
      try {
        const periodosRes = await periodosService.listar();
        const periodos = periodosRes.data || periodosRes;
        const periodoActivo = periodos.find((p: any) => p.activo);
        
        if (!periodoActivo) {
          return 'No hay un periodo académico activo actualmente.';
        }

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

    return 'Como director, puedo ayudarte a consultar los cursos por ciclo y el resumen general del periodo académico. ¿Qué necesitas?';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Add loading message
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        isLoading: true,
      },
    ]);

    try {
      const response = await processMessage(userMessage.content);
      
      // Replace loading message with actual response
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
            ? {
                ...msg,
                content: 'Lo siento, ocurrió un error. Por favor, intenta nuevamente.',
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating button */}
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

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[420px] max-w-[92vw] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
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

          {/* Messages container */}
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

          {/* Input area */}
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
