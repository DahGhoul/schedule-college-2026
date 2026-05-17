interface ProgresoCurso {
  idCurso: number;
  nombreCurso: string;
  tipoClase: string;
  horasRequeridas: number;
  horasAsignadas: number;
}

interface IndicadorProgresoHorasProps {
  progreso: ProgresoCurso[];
}

export function IndicadorProgresoHoras({ progreso }: IndicadorProgresoHorasProps) {
  return (
    <div className="space-y-2">
      {progreso.map((item, idx) => {
        const porcentaje = Math.round((item.horasAsignadas / item.horasRequeridas) * 100);
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-sm w-40 truncate">{item.nombreCurso} ({item.tipoClase})</span>
            <div className="flex-1 bg-gray-200 rounded h-4">
              <div
                className="bg-blue-500 h-4 rounded"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <span className="text-sm w-20 text-right">
              {item.horasAsignadas}/{item.horasRequeridas}h
            </span>
          </div>
        );
      })}
    </div>
  );
}