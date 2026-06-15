import { Request, Response } from 'express';
import { PeriodosService } from './periodos.service';
import { crearPeriodoSchema, actualizarPeriodoSchema } from './periodos.schema';

export class PeriodosController {
  static async listar(req: Request, res: Response) {
    const periodos = await PeriodosService.listar();
    res.json(periodos);
  }

  static async obtener(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const periodo = await PeriodosService.obtenerPorId(id);
    if (!periodo) return res.status(404).json({ error: 'Período no encontrado' });
    res.json(periodo);
  }

  static async crear(req: Request, res: Response) {
    const datos = crearPeriodoSchema.parse(req.body);
    const periodo = await PeriodosService.crear(datos as any);
    res.status(201).json(periodo);
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const datos = actualizarPeriodoSchema.parse(req.body);
    const periodo = await PeriodosService.actualizar(id, datos as any);
    res.json(periodo);
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    await PeriodosService.eliminar(id);
    res.json({ mensaje: 'Período desactivado' });
  }

  static async reactivar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const periodo = await PeriodosService.reactivar(id);
    res.json(periodo);
  }

  static async cambiarEstado(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { estado } = req.body;
    const periodo = await PeriodosService.cambiarEstado(id, estado);
    res.json(periodo);
  }

  static async obtenerActivo(req: Request, res: Response) {
    const periodo = await PeriodosService.obtenerActivo();
    if (!periodo) return res.status(404).json({ error: 'No hay período activo' });
    res.json(periodo);
  }

  static async obtenerCiclos(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const ciclos = await PeriodosService.obtenerCiclosPorPeriodo(id);
    res.json(ciclos);
  }

  static async obtenerCiclosActivo(req: Request, res: Response) {
    const periodo = await PeriodosService.obtenerActivo();
    if (!periodo) return res.status(404).json({ error: 'No hay período activo' });
    const ciclos = await PeriodosService.obtenerCiclosPorPeriodo(periodo.id);
    res.json(ciclos);
  }
}