interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'peligro';
}

export function Boton({ variante = 'primario', className, ...props }: BotonProps) {
  const base = 'px-4 py-2 rounded-md font-medium disabled:opacity-50';
  const variantes = {
    primario: 'bg-blue-600 text-white hover:bg-blue-700',
    secundario: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={`${base} ${variantes[variante]} ${className}`}
      {...props}
    />
  );
}