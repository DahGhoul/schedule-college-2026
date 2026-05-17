'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Ocupacion {
  codigo: string;
  tipo: string;
  ocupados: number;
  capacidad: number;
}

export function GraficoOcupacionAmbientes({ datos }: { datos: Ocupacion[] }) {
  const data = datos.map((d) => ({
    nombre: d.codigo,
    Ocupados: d.ocupados,
    Capacidad: d.capacidad,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Ocupación de Ambientes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Ocupados" fill="#2196F3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}