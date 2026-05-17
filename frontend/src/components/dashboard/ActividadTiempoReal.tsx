'use client';
interface Evento {
  tipo: string;
  timestamp?: string;
  [key: string]: any;
}

export function ActividadTiempoReal({ eventos }: { eventos: Evento[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Actividad en Tiempo Real</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {eventos.length === 0 && <p className="text-gray-400">Sin actividad reciente</p>}
        {eventos.map((ev, idx) => (
          <div key={idx} className="text-sm border-b pb-1">
            <span className="font-mono text-xs text-gray-400">
              {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
            </span>{' '}
            <span className="font-semibold">{ev.tipo}:</span>{' '}
            <span>{JSON.stringify(ev).slice(0, 80)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}