'use client';
import { useAuthStore } from '@/stores/auth.store';
import { PanelPreferenciasNotificacion } from '@/components/notificaciones/PanelPreferenciasNotificacion';
import { HistorialNotificaciones } from '@/components/notificaciones/HistorialNotificaciones';

export default function NotificacionesPage() {
  const { usuario } = useAuthStore();
  const docenteId = usuario?.idDocente || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notificaciones</h1>
      <p className="text-gray-500">Gestione sus preferencias y consulte el historial de notificaciones.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PanelPreferenciasNotificacion docenteId={docenteId} />
        <HistorialNotificaciones docenteId={docenteId} />
      </div>
    </div>
  );
}