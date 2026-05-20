'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

interface ConfirmacionHorarioProps {
  docenteId: number;
  idPeriodo: number;
  alConfirmar: () => void;
  deshabilitado?: boolean;
}

export function ConfirmacionHorario({ docenteId, idPeriodo, alConfirmar, deshabilitado }: ConfirmacionHorarioProps) {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => horariosService.confirmarSeleccion({ idDocente: docenteId, idPeriodo }),
    onSuccess: (res) => {
      setMensaje(res.data.mensaje);
      alConfirmar();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al confirmar');
    },
  });

  return (
    <div className="flex items-center gap-4">
      <Boton onClick={() => mutation.mutate()} disabled={mutation.isPending || deshabilitado}>
        {mutation.isPending ? 'Confirmando...' : 'Confirmar Horario'}
      </Boton>
      {mensaje && <NotificacionToast mensaje={mensaje} tipo="exito" />}
      {error && <NotificacionToast mensaje={error} tipo="error" />}
    </div>
  );
}