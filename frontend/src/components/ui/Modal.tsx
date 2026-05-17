interface ModalProps {
  children: React.ReactNode;
  cerrar: () => void;
}

export function Modal({ children, cerrar }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <button onClick={cerrar} className="float-right text-gray-500 hover:text-gray-700">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}