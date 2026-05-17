'use client';
import { useQuery } from '@tanstack/react-query';
import { ventanasService } from '@/services/ventanas.service';
import { periodosService } from '@/services/periodos.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useRouter } from 'next/navigation';

export default function MonitorVentanasPage() {
  const router = useRouter();
  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const { data: ventanas, isLoading } = useQuery({
    queryKey: ['ventanas', periodoActivo?.id],
    queryFn: () => ventanasService.listar(periodoActivo?.id),
    enabled: !!periodoActivo,
  });

  const columnas = [
    { clave: 'fecha', titulo: 'Fecha', render: (item: any) => new Date(item.fecha).toLocaleDateString('es-PE') },
    { clave: 'categoria', titulo: 'Categoría' },
    { clave: 'modalidad', titulo: 'Modalidad' },
    {
      clave: 'progreso',
      titulo: 'Progreso',
      render: (item: any) => {
        const atendidos = item.atenciones?.filter((a: any) => a.estado === 'COMPLETADO').length || 0;
        const total = item.atenciones?.length || 0;
        return `${atendidos}/${total}`;
      },
    },
    { clave: 'estado', titulo: 'Estado' },
  ];

  if (isLoading) return <SpinnerCarga />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Monitor de Ventanas</h1>
      <p className="mb-2">Período activo: {periodoActivo?.nombre || 'Ninguno'}</p>
      <TablaDatos
        columnas={columnas}
        datos={ventanas?.data || []}
        alHacerClick={(v) => router.push(`/dashboard/horarios/ventanas/${v.id}`)}
      />
    </div>
  );
}