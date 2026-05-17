export interface Curso {
  id: number;
  nombre: string;
  codigo: string;
  horasTeoria: number;
  horasLaboratorio: number;
  creditos: number;
}

export interface CursoConRelaciones extends Curso {
  grupos?: any[];
  ambientes?: {
    id: number;
    tipo_clase: string;
    ambiente: {
      id: number;
      codigo: string;
      tipo: string;
      capacidad: number;
    };
  }[];
}