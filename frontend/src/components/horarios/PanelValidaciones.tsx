import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PanelValidacionesProps {
  validacion: {
    valido: boolean;
    conflictos: string[];
    advertencias: string[];
  } | null;
}

export function PanelValidaciones({ validacion }: PanelValidacionesProps) {
  if (!validacion) return null;

  const sinAlertas = validacion.conflictos.length === 0 && validacion.advertencias.length === 0;

  return (
    <div className="space-y-2.5">
      {validacion.conflictos.map((conflicto, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-left-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-red-200 leading-tight">
            {conflicto}
          </p>
        </div>
      ))}
      
      {validacion.advertencias.map((adv, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-left-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-400 leading-tight">
            {adv}
          </p>
        </div>
      ))}
      
      {sinAlertas && validacion.valido && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
            Sin conflictos detectados
          </p>
        </div>
      )}
    </div>
  );
}