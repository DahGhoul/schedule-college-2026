import { Request, Response } from 'express';
import { HorariosService } from './horarios.service';
import {
  seleccionarCeldaSchema,
  deseleccionarCeldaSchema,
  validarSeleccionSchema,
  confirmarSeleccionSchema, 
  cambiarEstadoSchema,
  publicarSchema,
  generarHorariosSchema
} from './horarios.schema';
import { prisma } from '@/lib/prisma';
import { PublicadorHorarios } from './publicador-horarios.service';
import { GeneradorHorariosService } from './generador-horarios.service';

export class HorariosController {
  private static validarAccesoDocente(req: Request, idDocente: number) {
    const usuario = (req as any).usuario;
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }

    if (usuario.rol === 'DOCENTE' && usuario.idDocente !== idDocente) {
      throw new Error('No autorizado para gestionar horarios de otro docente');
    }
  }

  static async obtenerMatrizDisponibilidad(req: Request, res: Response) {
    try {
      const idAmbiente = parseInt(req.params.ambienteId);
      const idPeriodo = parseInt(req.query.idPeriodo as string);
      if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });

      const usuario = (req as any).usuario;
      let idDocente: number | undefined = req.query.idDocente ? parseInt(req.query.idDocente as string) : undefined;
      if (usuario?.rol === 'DOCENTE') {
        idDocente = usuario.idDocente ?? undefined;
      }

      const matriz = await HorariosService.obtenerMatrizDisponibilidad(idAmbiente, idPeriodo, idDocente);
      res.json(matriz);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async seleccionarCelda(req: Request, res: Response) {
    try {
      const datos = seleccionarCeldaSchema.parse(req.body) as {
        idDocente: number;
        idComponente: number;
        idGrupo: number;
        idAmbiente: number;
        diaSemana: string;
        horaInicio: string;
        horaFin: string;
        sesionId: string;
      };
      HorariosController.validarAccesoDocente(req, datos.idDocente);
      const resultado = await HorariosService.seleccionarCelda(datos);
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }
  static async deseleccionarCelda(req: Request, res: Response) {
    try {
      const datos = deseleccionarCeldaSchema.parse(req.body) as {
        idDocente: number;
        idAmbiente?: number;
        diaSemana: string;
        horaInicio: string;
      };
      HorariosController.validarAccesoDocente(req, datos.idDocente);
      const resultado = await HorariosService.deseleccionarCelda(datos as any);
      res.json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
  static async obtenerSeleccionesTemporales(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.docenteId);
      HorariosController.validarAccesoDocente(req, idDocente);
      const selecciones = await HorariosService.obtenerSeleccionesTemporales(idDocente);
      res.json(selecciones);
    } catch (error: any) {
      console.error('Error en obtenerSeleccionesTemporales:', error);
      if (error.message?.includes('No autorizado')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al obtener selecciones' });
    }
  }

  static async validarSeleccion(req: Request, res: Response) {
    try {
      const datos = validarSeleccionSchema.parse(req.body);
      HorariosController.validarAccesoDocente(req, datos.idDocente);
      const resultado = await HorariosService.validarSeleccion(datos.idDocente, datos.idPeriodo);
      res.json(resultado);
    } catch (error: any) {
      console.error('Error en validarSeleccion:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
  static async obtenerProgreso(req: Request, res: Response) {
    try {
      const idDocente = parseInt(req.params.docenteId);
      HorariosController.validarAccesoDocente(req, idDocente);
      const progreso = await HorariosService.obtenerProgreso(idDocente);
      res.json(progreso);
    } catch (error: any) {
      console.error('Error en obtenerProgreso:', error);
      if (error.message?.includes('No autorizado')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al obtener progreso' });
    }
  }

  static async obtenerPendientesAmbiente(req: Request, res: Response) {
    try {
      const pendientes = await HorariosService.obtenerPendientesAmbiente();
      res.json(pendientes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ... (métodos existentes de la Fase 5)

    static async confirmarSeleccion(req: Request, res: Response) {
    try {
        const datos = confirmarSeleccionSchema.parse(req.body);
      HorariosController.validarAccesoDocente(req, datos.idDocente);
        const horarios = await PublicadorHorarios.confirmarSeleccion(datos.idDocente, datos.idPeriodo);
        res.status(201).json({ mensaje: 'Selección confirmada', horarios });
    } catch (error: any) {
        if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
        } else if (error.message?.includes('No autorizado')) {
        res.status(403).json({ error: error.message });
        } else {
        res.status(400).json({ error: error.message });
        }
    }
    }

    static async cambiarEstado(req: Request, res: Response) {
    try {
        const { idBloqueHorario, nuevoEstado } = cambiarEstadoSchema.parse(req.body);
        const usuario = (req as any).usuario?.email || 'sistema';
        const horario = await PublicadorHorarios.cambiarEstadoHorario(idBloqueHorario, nuevoEstado, usuario);
        res.json(horario);
    } catch (error: any) {
        if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
        } else {
        res.status(400).json({ error: error.message });
        }
    }
    }

    static async publicar(req: Request, res: Response) {
    try {
        const datos = publicarSchema.parse(req.body);
        const usuario = (req as any).usuario?.email || 'sistema';
        const resultado = await PublicadorHorarios.publicarPeriodo(datos.idPeriodo, usuario);
        res.json(resultado);
    } catch (error: any) {
        if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
        } else {
        res.status(400).json({ error: error.message });
        }
    }
    }

    static async despublicar(req: Request, res: Response) {
    try {
        const datos = publicarSchema.parse(req.body);
        const usuario = (req as any).usuario?.email || 'sistema';
        const resultado = await PublicadorHorarios.despublicarPeriodo(datos.idPeriodo, usuario);
        res.json(resultado);
    } catch (error: any) {
        if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
        } else {
        res.status(400).json({ error: error.message });
        }
    }
    }

    static async obtenerConflictos(req: Request, res: Response) {
    try {
        const idPeriodo = parseInt(req.query.idPeriodo as string);
        if (!idPeriodo) return res.status(400).json({ error: 'idPeriodo requerido' });
        const conflictos = await PublicadorHorarios.detectarConflictos(idPeriodo);
        res.json(conflictos);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
    }

    static async listarHorarios(req: Request, res: Response) {
    try {
        const { idPeriodo, idDocente, idAmbiente, idGrupo } = req.query;
        const where: any = {};
        if (idPeriodo) where.id_periodo = parseInt(idPeriodo as string);
        if (idDocente) where.id_docente = parseInt(idDocente as string);
        if (idAmbiente) where.id_ambiente = parseInt(idAmbiente as string);
        if (idGrupo) where.id_grupo = parseInt(idGrupo as string);

        const horarios = await prisma.bloque_horario.findMany({
        where,
        include: {
            docente: true,
            componente: { include: { oferta: { include: { curso: true, ciclo: true } } } },
            ambiente: true,
            grupo: { include: { componente: { include: { oferta: { include: { curso: true } } } } } },
        },
        orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        });
        res.json(horarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar horarios' });
    }
    }

    static async generarHorarios(req: Request, res: Response) {
    try {
      const datos = generarHorariosSchema.parse(req.body) as {
        idPeriodo: number;
        idCiclo?: number | null;
        modoPrueba?: boolean;
      };
      const resultado = await GeneradorHorariosService.generar(datos);
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      } else {
      res.status(400).json({ error: error.message });
      }
    }
    }
}
