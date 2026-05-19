import { Request, Response } from 'express';
import { VentanasService } from './ventanas.service';
import { configurarVentanasSchema } from './ventanas.schema';

export class VentanasController {
  static async generarAutomatica(req: Request, res: Response) {
    try {
      const { idPeriodo, fechaInicio } = req.body;
      if (!idPeriodo || !fechaInicio) {
        return res.status(400).json({ error: 'idPeriodo y fechaInicio son requeridos' });
      }
      const ventanas = await VentanasService.generarAutomaticamente(idPeriodo, fechaInicio);
      res.status(201).json(ventanas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async configurar(req: Request, res: Response) {
    try {
      const datos = configurarVentanasSchema.parse(req.body);
      const ventanas = await VentanasService.configurar(datos.idPeriodo, datos.dias as any);
      res.status(201).json(ventanas);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  static async listar(req: Request, res: Response) {
    const idPeriodo = req.query.periodo ? parseInt(req.query.periodo as string) : undefined;
    const ventanas = await VentanasService.listar(idPeriodo);
    res.json(ventanas);
  }

  static async obtenerActiva(req: Request, res: Response) {
    const idPeriodo = req.query.periodo ? parseInt(req.query.periodo as string) : undefined;
    const ventana = await VentanasService.obtenerActiva(idPeriodo);
    res.json(ventana || null);
  }

  static async obtener(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const ventana = await VentanasService.obtenerPorId(id);
    if (!ventana) return res.status(404).json({ error: 'Ventana no encontrada' });
    res.json(ventana);
  }

  static async iniciar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    try {
      const resultado = await VentanasService.iniciarVentana(id);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async obtenerCola(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const cola = await VentanasService.obtenerCola(id);
    res.json(cola);
  }

  static async siguienteDocente(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const siguiente = await VentanasService.siguienteDocente(id);
    res.json(siguiente || { mensaje: 'No hay más docentes' });
  }

  static async marcarAtendido(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { idDocente } = req.body;
    if (!idDocente) return res.status(400).json({ error: 'idDocente requerido' });
    try {
      await VentanasService.marcarAtendido(id, idDocente);
      res.json({ mensaje: 'Docente marcado como atendido' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}