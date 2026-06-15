export interface RestriccionInstitucional {
  franjaInicio: string;        // "07:00"
  franjaFin: string;           // "22:00"
  horasMaximasDiarias: number; // 8
  bloqueoAlmuerzoInicio: string; // "12:00"
  bloqueoAlmuerzoFin: string;   // "13:00"
  tiempoAtencionVentana: number; // 30 (minutos)
  limiteMinPreparacionPct: number; // 0.5 (50%)
  limiteMaxAsesoriaTesis: number;  // 2 (horas)
  limiteMaxCapacitacion: number;   // 1 (hora)
  limiteMaxInvestigacion: number;  // 6 (horas)
}

export interface DiaNoLaborable {
  id: number;
  fecha: string;       // YYYY-MM-DD
  descripcion: string;
  tipo: string;        // FERIADO, MANTENIMIENTO
}