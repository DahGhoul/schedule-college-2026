'use client';
import { useRouter } from 'next/navigation';

export function SelectorTipoReporte() {
  const router = useRouter();

  const tipos = [
    { tipo: 'aula', etiqueta: 'Horario por Aula', icono: '🏫' },
    { tipo: 'laboratorio', etiqueta: 'Horario por Laboratorio', icono: '🔬' },
    { tipo: 'docente', etiqueta: 'Horario por Docente', icono: '👨‍🏫' },
    { tipo: 'gestion', etiqueta: 'Reporte de Gestión', icono: '📊' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tipos.map((t) => (
        <div
          key={t.tipo}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/dashboard/reportes/${t.tipo}`)}
        >
          <p className="text-3xl mb-2">{t.icono}</p>
          <h3 className="text-lg font-semibold">{t.etiqueta}</h3>
        </div>
      ))}
    </div>
  );
}