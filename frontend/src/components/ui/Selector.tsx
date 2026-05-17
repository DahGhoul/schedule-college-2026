interface SelectorProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  opciones: { valor: string; etiqueta: string }[];
}

export function Selector({ label, opciones, ...props }: SelectorProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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