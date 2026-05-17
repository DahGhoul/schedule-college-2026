'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DatosAvance {
  modalidad: string;
  categoria: string;
  totalDocentes: number;
  horariosAsignados: number;
  horariosPendientes: number;
}

export function GraficoAvanceCategoria({ datos }: { datos: DatosAvance[] }) {
  const data = datos.map((d) => ({
    nombre: `${d.categoria} (${d.modalidad})`,
    Asignados: d.horariosAsignados,
    Pendientes: d.horariosPendientes,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Avance por Categoría</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Asignados" stackId="a" fill="#4CAF50" />
          <Bar dataKey="Pendientes" stackId="a" fill="#FFC107" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}