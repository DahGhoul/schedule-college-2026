'use client';
import { useQuery } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

interface VisorConflictosProps {
  idPeriodo: number;
}

export function VisorConflictos({ idPeriodo }: VisorConflictosProps) {
  const { data: conflictos, isLoading } = useQuery({
    queryKey: ['conflictos', idPeriodo],
    queryFn: () => horariosService.obtenerConflictos(idPeriodo).then((res) => res.data),
    enabled: !!idPeriodo,
  });

  if (isLoading) return <SpinnerCarga />;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Conflictos Detectados</h2>
      {conflictos?.length === 0 ? (
        <p className="text-green-600">✅ No se encontraron conflictos</p>
      ) : (
        <div className="space-y-2">
          {conflictos?.map((c: any, idx: number) => (
            <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="font-medium">{c.tipo}</p>
              <p className="text-sm">{c.descripcion}</p>
              <p className="text-xs text-gray-500">Involucrados: {c.involucrados.join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}