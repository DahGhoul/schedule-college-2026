interface NotificacionToastProps {
  mensaje: string;
  tipo: 'exito' | 'error' | 'advertencia';
}

export function NotificacionToast({ mensaje, tipo }: NotificacionToastProps) {
  const estilos = {
    exito: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    advertencia: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };
  return (
    <div className={`p-4 rounded-md border ${estilos[tipo]}`}>
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}