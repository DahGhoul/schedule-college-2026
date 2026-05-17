interface KPI {
  etiqueta: string;
  valor: number | string;
  color?: string;
}

export function PanelKPIs({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{kpi.etiqueta}</p>
          <p className={`text-2xl font-bold ${kpi.color || 'text-gray-800'}`}>
            {kpi.valor}
          </p>
        </div>
      ))}
    </div>
  );
}