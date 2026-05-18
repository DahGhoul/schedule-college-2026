interface CampoTextoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function CampoTexto({ label, error, ...props }: CampoTextoProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        className={`mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-unt-primary focus:ring-2 focus:ring-unt-primary/20 focus:outline-none bg-white ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'hover:border-gray-400'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}