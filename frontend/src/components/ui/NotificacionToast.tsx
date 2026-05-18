interface NotificacionToastProps {
  mensaje: string;
  tipo: 'exito' | 'error' | 'advertencia';
  onClose?: () => void;
}

export function NotificacionToast({ mensaje, tipo, onClose }: NotificacionToastProps) {
  const estilos = {
    exito: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    advertencia: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md border shadow-lg z-50 ${estilos[tipo]}`}>
      <div className="flex justify-between items-start gap-4">
        <p className="text-sm">{mensaje}</p>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}