'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useRouter } from 'next/navigation';

const columnas = [
  { clave: 'nombres', titulo: 'Nombres' },
  { clave: 'apellidos', titulo: 'Apellidos' },
  { clave: 'email', titulo: 'Correo' },
  {
    clave: 'modalidad',
    titulo: 'Modalidad',
    render: (item: any) => (
      <span className={`px-2 py-1 rounded text-xs ${item.modalidad === 'NOMBRADO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
        {item.modalidad}
      </span>
    ),
  },
  { clave: 'categoria', titulo: 'Categoría' },
  { clave: 'antiguedad', titulo: 'Antigüedad' },
];

export default function DocentesPage() {
  const router = useRouter();
  const [buscar, setBuscar] = useState('');

  const { data: docentes, isLoading } = useQuery({
    queryKey: ['docentes', buscar],
    queryFn: () => docentesService.listar({ buscar }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Docentes</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Boton onClick={() => router.push('/dashboard/docentes/nuevo')}>
            Nuevo Docente
          </Boton>
        </div>
      </div>
      {isLoading ? <SpinnerCarga /> : (
        <TablaDatos
          columnas={columnas}
          datos={docentes?.data || []}
          alHacerClick={(docente) => router.push(`/dashboard/docentes/${docente.id}`)}
        />
      )}
    </div>
  );
}