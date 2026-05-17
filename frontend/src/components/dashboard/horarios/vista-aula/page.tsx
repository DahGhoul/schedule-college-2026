'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ambientesService } from '@/services/ambientes.service';
import { horariosService } from '@/services/horarios.service';
import { periodosService } from '@/services/periodos.service';
import { Selector } from '@/components/ui/Selector';
import { VistaHorarioAula } from '@/components/horarios/VistaHorarioAula';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function VistaHorarioAulaPage() {
  const [ambienteSeleccionado, setAmbienteSeleccionado] = useState<number | null>(null);

  // Obtener período activo
  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  // Obtener lista de ambientes activos
  const { data: ambientes } = useQuery({
    queryKey: ['ambientes-activos'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  // Obtener horarios del ambiente seleccionado en el período activo
  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios-aula', ambienteSeleccionado, periodoActivo?.id],
    queryFn: () =>
      horariosService
        .listarHorarios({
          idAmbiente: ambienteSeleccionado,
          idPeriodo: periodoActivo?.id,
        })
        .then((res) => res.data),
    enabled: !!ambienteSeleccionado && !!periodoActivo,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Horario por Aula / Laboratorio</h1>

      <div className="mb-4 max-w-md">
        <Selector
          label="Seleccionar Ambiente"
          opciones={[
            { valor: '', etiqueta: 'Seleccionar...' },
            ...(ambientes
              ?.filter((a: any) => a.activo)
              .map((a: any) => ({
                valor: String(a.id),
                etiqueta: `${a.codigo} (${a.tipo === 'AULA' ? 'Aula' : 'Laboratorio'}, Cap: ${a.capacidad})`,
              })) || []),
          ]}
          value={ambienteSeleccionado?.toString() || ''}
          onChange={(e) => setAmbienteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
        />
      </div>

      {!ambienteSeleccionado && (
        <p className="text-gray-500">Seleccione un ambiente para visualizar su horario.</p>
      )}

      {ambienteSeleccionado && isLoading && <SpinnerCarga />}

      {ambienteSeleccionado && !isLoading && horarios?.length > 0 && (
        <VistaHorarioAula horarios={horarios} />
      )}

      {ambienteSeleccionado && !isLoading && horarios?.length === 0 && (
        <p>No hay horarios asignados para este ambiente en el período activo.</p>
      )}
    </div>
  );
}