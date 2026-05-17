'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { notificacionesService } from '@/services/notificaciones.service';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

interface VerificacionWhatsAppProps {
  docenteId: number;
}

export function VerificacionWhatsApp({ docenteId }: VerificacionWhatsAppProps) {
  const [codigo, setCodigo] = useState('');
  const mutation = useMutation({
    mutationFn: () => notificacionesService.verificarWhatsApp(docenteId, codigo),
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Verificar WhatsApp</h3>
      <p className="text-sm text-gray-500 mb-4">Ingrese el código de verificación enviado a su teléfono.</p>
      <CampoTexto
        label="Código de verificación"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="123456"
      />
      <Boton
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4"
      >
        Verificar
      </Boton>
      {mutation.isSuccess && <NotificacionToast mensaje="WhatsApp verificado" tipo="exito" />}
      {mutation.isError && <NotificacionToast mensaje="Código inválido" tipo="error" />}
    </div>
  );
}