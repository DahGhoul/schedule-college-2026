'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionesService } from '@/services/notificaciones.service';
import { Boton } from '@/components/ui/Boton';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

interface PanelPreferenciasNotificacionProps {
  docenteId: number;
}

export function PanelPreferenciasNotificacion({ docenteId }: PanelPreferenciasNotificacionProps) {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['preferencias-notificacion', docenteId],
    queryFn: () => notificacionesService.obtenerPreferencias(docenteId).then((r) => r.data),
    enabled: !!docenteId,
  });

  const mutation = useMutation({
    mutationFn: (datos: any) => notificacionesService.actualizarPreferencias(docenteId, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferencias-notificacion', docenteId] }),
  });

  if (isLoading) return <SpinnerCarga />;

  const toggle = (campo: string, valor: boolean) => {
    mutation.mutate({ [campo]: valor });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold">Canales de Notificación</h3>

      <div className="flex items-center justify-between">
        <span className="text-gray-700">📧 Correo Electrónico</span>
        <button
          onClick={() => toggle('correoHabilitado', !prefs?.correoHabilitado)}
          className={`w-12 h-6 rounded-full transition ${prefs?.correoHabilitado ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${prefs?.correoHabilitado ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-700">💬 WhatsApp</span>
        <button
          onClick={() => toggle('whatsappHabilitado', !prefs?.whatsappHabilitado)}
          className={`w-12 h-6 rounded-full transition ${prefs?.whatsappHabilitado ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${prefs?.whatsappHabilitado ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-700">📱 Telegram</span>
        <button
          onClick={() => toggle('telegramHabilitado', !prefs?.telegramHabilitado)}
          className={`w-12 h-6 rounded-full transition ${prefs?.telegramHabilitado ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${prefs?.telegramHabilitado ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {mutation.isSuccess && <NotificacionToast mensaje="Preferencias actualizadas" tipo="exito" />}
    </div>
  );
}