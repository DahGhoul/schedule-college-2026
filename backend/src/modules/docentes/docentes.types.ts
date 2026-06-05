export interface Docente {
  id: number;

  codigo_ibm?: string;

  dni?: string;

  nombres: string;

  apellidos: string;

  email: string;

  empleo?: string;

  telefono?: string;

  modalidad: string;

  categoria: string;

  dedicacion: string;

  antiguedad: number;

  horas_max_semana?: number;

  id_sede_principal?: number;

  activo: boolean;
}