import { Request, Response } from 'express';
import { VentanasService } from './ventanas.service';
import {
  configurarVentanasSchema,
  generarHorarioVentanasSchema,
  desactivarVentanasSchema,
  enviarCorreosVentanasSchema,
  actualizarTurnoSchema,
  desactivarTurnoSchema,
} from './ventanas.schema';

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

  static async generarHorario(req: Request, res: Response) {
    try {
      const datos = generarHorarioVentanasSchema.parse(req.body);
      const resultado = await VentanasService.generarHorarioAtencion(
        datos.idPeriodo,
        datos.fechaInicio,
        datos.fechaFin,
        datos.horaInicio,
        datos.horaFin
      );
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async actualizarHorario(req: Request, res: Response) {
    try {
      const datos = generarHorarioVentanasSchema.parse(req.body);
      const resultado = await VentanasService.generarHorarioAtencion(
        datos.idPeriodo,
        datos.fechaInicio,
        datos.fechaFin,
        datos.horaInicio,
        datos.horaFin,
        true
      );
      res.status(200).json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async desactivar(req: Request, res: Response) {
    try {
      const datos = desactivarVentanasSchema.parse(req.body);
      const resultado = await VentanasService.desactivarVentanas(datos.idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async enviarCorreos(req: Request, res: Response) {
    try {
      const datos = enviarCorreosVentanasSchema.parse(req.body);
      const resultado = await VentanasService.enviarCorreosVentanas(datos.idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async actualizarTurno(req: Request, res: Response) {
    try {
      const datos = actualizarTurnoSchema.parse(req.body);
      const resultado = await VentanasService.actualizarTurno(
        datos.idVentana,
        datos.idDocente,
        datos.fecha,
        datos.horaInicio,
        datos.horaFin
      );
      res.json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async desactivarTurno(req: Request, res: Response) {
    try {
      const datos = desactivarTurnoSchema.parse(req.body);
      const resultado = await VentanasService.desactivarTurno(datos.idVentana, datos.idDocente);
      res.json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  static async obtenerActiva(req: Request, res: Response) {
    const idPeriodo = req.query.periodo ? parseInt(req.query.periodo as string) : undefined;
    const ventana = await VentanasService.obtenerActiva(idPeriodo);
    res.json(ventana || null);
  }

  static async miTurno(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idDocente = usuario?.idDocente;
      if (!idDocente) {
        // No es docente → acceso libre (admin/secretaria)
        return res.json({ acceso: true, razon: 'NO_ES_DOCENTE' });
      }
      const idPeriodo = req.query.idPeriodo ? parseInt(req.query.idPeriodo as string) : 0;
      if (!idPeriodo) {
        return res.status(400).json({ error: 'idPeriodo requerido' });
      }
      const resultado = await VentanasService.obtenerTurnoDocente(idDocente, idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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