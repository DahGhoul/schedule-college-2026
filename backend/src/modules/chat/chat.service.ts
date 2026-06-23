export class ChatService {
  static async consultarIA(consulta: string, rol?: string, contexto?: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Eres un asistente del sistema de horarios universitarios.
Rol del usuario: ${rol || 'desconocido'}.
Contexto adicional: ${contexto || 'ninguno'}.

Responde de forma útil, concisa y en español a esta consulta:
${consulta}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text || null;
    } catch {
      return null;
    }
  }
}
