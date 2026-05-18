export interface CeldaHorario {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface SeleccionTemporal {
  idDocente: number;
  idCurso: number;
  idGrupo?: number;
  idAmbiente: number;
  modoPrueba?: boolean;
  tipoClase: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  sesionId: string;
}

export interface DisponibilidadCelda {
  diaSemana: string;
  horaInicio: string;
  estado: 'LIBRE' | 'OCUPADO' | 'SELECCION_TEMPORAL' | 'BLOQUEO_INSTITUCIONAL';
}

export interface MatrizDisponibilidad {
  ambienteId: number;
  ambienteCodigo: string;
  filas: {
    horaInicio: string;
    celdas: DisponibilidadCelda[];
  }[];
}

export interface ValidacionResultado {
  valido: boolean;
  conflictos: string[];
  advertencias: string[];
}

export interface ProgresoCurso {
  idCurso: number;
  nombreCurso: string;
  tipoClase: string;
  horasRequeridas: number;
  horasAsignadas: number;
}

// Añadir estos tipos al archivo existente
export interface HorarioAsignado {
  id: number;
  idPeriodo: number;
  idDocente: number;
  idCurso: number;
  idGrupo?: number;
  idAmbiente: number;
  tipoClase: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  idVentana?: number;
}

export interface ConflictoGlobal {
  tipo: string;
  descripcion: string;
  involucrados: string[];
}

export interface RegistroAuditoria {
  id: number;
  idHorario?: number;
  tipoAccion: string;
  usuario: string;
  fecha: Date;
  detalle: string;
}