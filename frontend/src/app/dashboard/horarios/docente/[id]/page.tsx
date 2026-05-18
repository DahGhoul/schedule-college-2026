'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

interface PageProps {
  params: { id: string };
}

export default function HorarioDocentePorIdPage({ params }: PageProps) {
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const docenteId = Number(params.id);

  const { data: periodos, isLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  useEffect(() => {
    if (!idPeriodo && periodos?.length > 0) {
      const activo = periodos.find((p: any) => p.estado === 'ACTIVO');
      if (activo) setIdPeriodo(activo.id);
      else setIdPeriodo(periodos[0].id);
    }
  }, [idPeriodo, periodos]);

  if (isLoading && !idPeriodo) return <SpinnerCarga />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Horario del Docente</h1>
        <p className="text-sm text-gray-500">Vista por docente (ID: {docenteId})</p>
      </div>
      {idPeriodo ? (
        <CalendarioGeneral idPeriodo={idPeriodo} filtroTipo="DOCENTE" filtroId={docenteId} modo="LECTURA" />
      ) : (
        <div className="p-12 text-center text-gray-500">
          Selecciona un periodo académico para ver el horario.
        </div>
      )}
    </div>
  );
}
