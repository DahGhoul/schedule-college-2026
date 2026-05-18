interface SelectorProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  opciones: { valor: string; etiqueta: string }[];
}

export function Selector({ label, opciones, ...props }: SelectorProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 bg-white shadow-sm hover:border-gray-400 focus:border-unt-primary focus:ring-2 focus:ring-unt-primary/20 focus:outline-none transition-all duration-200"
        {...props}
      >
        {opciones.map((op) => (
          <option key={op.valor} value={op.valor}>
            {op.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}