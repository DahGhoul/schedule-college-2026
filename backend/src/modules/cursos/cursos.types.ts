export interface Curso {
  id: number;
  nombre: string;
  codigo: string;
  creditos: number;
  activo: boolean;
  id_curricula?: number | null;
  curricula?: { id: number; nombre: string; codigo: string; vigente: boolean } | null;
}

export interface CursoConRelaciones extends Curso {
  ofertas?: any[];
}
