'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { notificacionesService } from '@/services/notificaciones.service';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

interface VerificacionTelegramProps {
  docenteId: number;
}

export function VerificacionTelegram({ docenteId }: VerificacionTelegramProps) {
  const [telegramId, setTelegramId] = useState('');
  const mutation = useMutation({
    mutationFn: () => notificacionesService.vincularTelegram(docenteId, telegramId),
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Vincular Telegram</h3>
      <p className="text-sm text-gray-500 mb-4">
        Inicie el bot de Telegram y obtenga su ID de chat.
      </p>
      <CampoTexto
        label="ID de Telegram"
        value={telegramId}
        onChange={(e) => setTelegramId(e.target.value)}
        placeholder="123456789"
      />
      <Boton
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4"
      >
        Vincular
      </Boton>
      {mutation.isSuccess && <NotificacionToast mensaje="Telegram vinculado" tipo="exito" />}
      {mutation.isError && <NotificacionToast mensaje="Error al vincular" tipo="error" />}
    </div>
  );
}