interface PanelValidacionesProps {
  validacion: {
    valido: boolean;
    conflictos: string[];
    advertencias: string[];
  } | null;
}

export function PanelValidaciones({ validacion }: PanelValidacionesProps) {
  if (!validacion) return null;

  return (
    <div className="space-y-2">
      {validacion.conflictos.map((conflicto, idx) => (
        <div key={idx} className="p-2 bg-red-50 text-red-700 rounded text-sm">
          ❌ {conflicto}
        </div>
      ))}
      {validacion.advertencias.map((adv, idx) => (
        <div key={idx} className="p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
          ⚠️ {adv}
        </div>
      ))}
      {validacion.valido && validacion.conflictos.length === 0 && (
        <div className="p-2 bg-green-50 text-green-700 rounded text-sm">
          ✅ Sin conflictos
        </div>
      )}
    </div>
  );
}