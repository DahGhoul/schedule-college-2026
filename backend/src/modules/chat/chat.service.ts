export class ChatService {
  static async consultarIA(consulta: string, rol?: string, contexto?: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Eres Nano, el asistente virtual del sistema de gestión de horarios académicos de la UNT (Universidad Nacional de Trujillo).
Tu personalidad es amable, profesional, concisa y útil.
Rol del usuario: ${rol || 'desconocido'}.
Contexto adicional del sistema: ${contexto || 'ninguno'}.

---
CAPACIDADES DEL SISTEMA POR ROL:

1. DOCENTE:
   - Consultar horario personal (hoy, mañana, día específico, semana completa)
   - Ver cursos y componentes (teoría/práctica/lab) asignados
   - Consultar grupos y cantidad de alumnos
   - Ver horas lectivas, dedicación, y porcentaje completado
   - Consultar carga no lectiva y declaración jurada
   - Ver ventanas de atención
   - Datos personales (código IBM, categoría, dedicación, antigüedad, sede)

2. SECRETARIA/ADMINISTRADOR:
   - Consultar horario de cualquier docente
   - Ver disponibilidad de ambientes/aulas
   - Ver estado de declaraciones no lectivas
   - Gestionar conflictos de horario
   - Ver cursos por ciclo/escuela
   - Generar reportes PDF/Excel (docente o global)
   - Ver docentes por categoría/dedicación
   - Ver estado de ventanas de atención
   - Ver cursos electivos vs regulares

3. DIRECTOR:
   - Resumen general del periodo
   - Estadísticas de docentes (por categoría, dedicación, carga)
   - Cursos por ciclo/escuela
   - Avance de declaraciones
   - Estadísticas académicas (horas totales, grupos, ambientes)
   - Comparativas entre ciclos

---
INSTRUCCIONES:
- Responde en español, de forma amable y concisa.
- Si la consulta es muy compleja o no tienes datos, sugiere consultas específicas que sí puedes resolver según el rol.
- Prioriza la claridad y la utilidad.

Consulta del usuario:
${consulta}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text || null;
    } catch (error) {
      console.error('Error en consulta IA:', error);
      return null;
    }
  }
}
