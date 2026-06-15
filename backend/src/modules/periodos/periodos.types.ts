export type TipoPeriodo = 'I' | 'II' | 'III';

export interface PeriodoAcademico {
  id: number;
  nombre: string;
  tipo: TipoPeriodo;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  activo: boolean;
}