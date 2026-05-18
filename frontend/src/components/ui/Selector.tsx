import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectorProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  opciones?: { valor: string; etiqueta: string }[];
  children?: ReactNode;
}

export function Selector({ label, opciones, children, className = '', ...props }: SelectorProps) {
  const classes = [
    'mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 bg-white shadow-sm hover:border-gray-400 focus:border-unt-primary focus:ring-2 focus:ring-unt-primary/20 focus:outline-none transition-all duration-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={classes}
        {...props}
      >
        {opciones?.length ? opciones.map((op) => (
          <option key={op.valor} value={op.valor}>
            {op.etiqueta}
          </option>
        )) : children}
      </select>
    </div>
  );
}