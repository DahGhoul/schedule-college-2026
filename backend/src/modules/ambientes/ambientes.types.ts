export interface Ambiente {
  id: number;
  codigo: string;
  tipo: string;          // 'AULA' | 'LABORATORIO'
  capacidad: number;
  piso: number | null;
  equipamiento: string | null;
  activo: boolean;
}

export interface AmbienteConDisponibilidad extends Ambiente {
  ocupaciones?: {
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    curso?: string;
    docente?: string;
  }[];
}