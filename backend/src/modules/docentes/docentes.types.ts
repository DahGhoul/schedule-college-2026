export interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  modalidad: string;
  categoria: string;
  antiguedad: number;
  activo: boolean;
}