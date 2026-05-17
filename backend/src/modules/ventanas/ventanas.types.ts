export interface VentanaAtencion {
  id: number;
  idPeriodo: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  categoria: string;
  modalidad: string;
  orden: number;
  estado: string;
}

export interface AtencionDocente {
  id: number;
  idVentana: number;
  idDocente: number;
  estado: string;
  ordenEspera: number;
  docente?: any;
}