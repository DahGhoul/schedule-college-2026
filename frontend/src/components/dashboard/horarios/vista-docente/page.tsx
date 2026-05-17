'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { horariosService } from '@/services/horarios.service';
import { periodosService } from '@/services/periodos.service';
import { Selector } from '@/components/ui/Selector';
import { VistaHorarioDocente } from '@/components/horarios/VistaHorarioDocente';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function VistaHorarioDocentePage() {
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(null);

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios', 'docente', docenteSeleccionado, periodoActivo?.id],
    queryFn: () =>
      horariosService
        .listarHorarios({ idDocente: docenteSeleccionado, idPeriodo: periodoActivo?.id })
        .then((res) => res.data),
    enabled: !!docenteSeleccionado && !!periodoActivo,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Horario por Docente</h1>
      <div className="mb-4">
        <Selector
          label="Seleccionar Docente"
          opciones={[
            { valor: '', etiqueta: 'Seleccionar...' },
            ...(docentes?.map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })) || []),
          ]}
          value={docenteSeleccionado?.toString() || ''}
          onChange={(e) => setDocenteSeleccionado(parseInt(e.target.value))}
        />
      </div>
      {isLoading ? (
        <SpinnerCarga />
      ) : horarios?.length > 0 ? (
        <VistaHorarioDocente selecciones={horarios.map((h: any) => ({ ...h, nombreCurso: h.curso?.nombre, codigoAmbiente: h.ambiente?.codigo }))} alQuitarCelda={() => {}} />
      ) : (
        <p>No hay horarios para este docente.</p>
      )}
    </div>
  );
}