'use client';
interface MapaCalorProps {
  dias: string[];
  horas: string[];
  conteo: Record<string, number>;
}

const getColor = (valor: number) => {
  if (valor === 0) return 'bg-green-100';
  if (valor <= 2) return 'bg-yellow-200';
  if (valor <= 4) return 'bg-orange-300';
  return 'bg-red-400';
};

export function MapaCalorOcupacion({ dias, horas, conteo }: MapaCalorProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-auto">
      <h3 className="text-lg font-semibold mb-2">Mapa de Calor de Ocupación</h3>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 border"></th>
            {dias.map((dia) => (
              <th key={dia} className="p-1 border">{dia.slice(0,3)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((hora) => (
            <tr key={hora}>
              <td className="border p-1 font-medium">{hora}</td>
              {dias.map((dia) => {
                const key = `${dia}-${hora}`;
                const valor = conteo[key] || 0;
                return (
                  <td key={key} className={`border p-1 ${getColor(valor)}`}>
                    {valor}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}