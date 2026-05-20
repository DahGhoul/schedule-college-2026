"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Selector } from '@/components/ui/Selector';
import { docentesService } from '@/services/docentes.service';
import { useAuthStore } from '@/stores/auth.store';

export default function VistaHorarioDocentePage() {
  const { usuario } = useAuthStore();
  const docenteIdFromSession = usuario?.idDocente || null;
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(docenteIdFromSession);
  const [mensaje] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: periodoActivo, isLoading } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Horario por Docente</h1>
      {mensaje && <NotificacionToast mensaje={mensaje.mensaje} tipo={mensaje.tipo} />}

      {/* Mostrar selector solo si el usuario no es un docente */}
      {!docenteIdFromSession && (
        <div className="mb-4">
          <Selector
            label="Seleccionar Docente"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar...' },
              ...(docentes?.map((d: any) => ({ valor: String(d.id), etiqueta: `${d.nombres} ${d.apellidos}` })) || []),
            ]}
            value={docenteSeleccionado?.toString() || ''}
            onChange={(e) => setDocenteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
      )}

      {isLoading ? (
        <SpinnerCarga />
      ) : docenteSeleccionado && periodoActivo ? (
        <div className="space-y-6">
          <CalendarioGeneral idPeriodo={periodoActivo.id} filtroTipo="DOCENTE" filtroId={docenteSeleccionado} modo="LECTURA" />
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          No se pudo identificar el docente de la sesión.
        </p>
      )}
    </div>
  );
}
