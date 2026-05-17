import { Request, Response } from 'express';
import { DocentesService } from './docentes.service';
import { crearDocenteSchema, actualizarDocenteSchema } from './docentes.schema';

export class DocentesController {
  static async listar(req: Request, res: Response) {
    const { modalidad, categoria, buscar } = req.query;
    const docentes = await DocentesService.listar({
      modalidad: modalidad as string,
      categoria: categoria as string,
      buscar: buscar as string,
    });
    res.json(docentes);
  }

  static async obtener(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const docente = await DocentesService.obtenerPorId(id);
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(docente);
  }

  static async crear(req: Request, res: Response) {
    const datos = crearDocenteSchema.parse(req.body);
    const docente = await DocentesService.crear(datos);
    res.status(201).json(docente);
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const datos = actualizarDocenteSchema.parse(req.body);
    const docente = await DocentesService.actualizar(id, datos);
    res.json(docente);
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    await DocentesService.eliminar(id);
    res.json({ mensaje: 'Docente desactivado' });
  }

  static async buscar(req: Request, res: Response) {
    const { q } = req.query;
    const docentes = await DocentesService.buscar(q as string);
    res.json(docentes);
  }

  static async porCategoria(req: Request, res: Response) {
    const { categoria, modalidad } = req.params;
    const docentes = await DocentesService.porCategoria(categoria, modalidad);
    res.json(docentes);
  }
}