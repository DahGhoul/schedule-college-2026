'use client';
import { useAuthStore } from '@/stores/auth.store';
import { PanelPreferenciasNotificacion } from '@/components/notificaciones/PanelPreferenciasNotificacion';
import { VerificacionWhatsApp } from '@/components/notificaciones/VerificacionWhatsApp';
import { VerificacionTelegram } from '@/components/notificaciones/VerificacionTelegram';

export default function PreferenciasNotificacionesPage() {
  const { usuario } = useAuthStore();
  const docenteId = usuario?.idDocente || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Preferencias de Notificación</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PanelPreferenciasNotificacion docenteId={docenteId} />
        <VerificacionWhatsApp docenteId={docenteId} />
        <VerificacionTelegram docenteId={docenteId} />
      </div>
    </div>
  );
}