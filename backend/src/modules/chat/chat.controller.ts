import { Request, Response } from 'express';
import { consultaSchema } from './chat.schema';
import { ChatService } from './chat.service';

export class ChatController {
  static async consultar(req: Request, res: Response) {
    const { consulta, rol, contexto } = consultaSchema.parse(req.body);
    const respuesta = await ChatService.consultarIA(consulta, rol, contexto);
    if (!respuesta) {
      return res.status(503).json({ error: 'IA no disponible', usarFallback: true });
    }
    res.json({ respuesta });
  }
}
