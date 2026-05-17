'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ventanasService } from '@/services/ventanas.service';
import { Boton } from '@/components/ui/Boton';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function AtencionVentanaPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const queryClient = useQueryClient();

  const { data: ventana, isLoading } = useQuery({
    queryKey: ['ventana', id],
    queryFn: () => ventanasService.obtener(id).then((res) => res.data),
  });

  const cola = useQuery({
    queryKey: ['cola', id],
    queryFn: () => ventanasService.obtenerCola(id).then((res) => res.data),
    enabled: !!ventana && ventana.estado !== 'COMPLETADO',
  });

  const iniciarMutation = useMutation({
    mutationFn: () => ventanasService.iniciar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventana', id] });
      queryClient.invalidateQueries({ queryKey: ['cola', id] });
    },
  });

  const siguienteMutation = useMutation({
    mutationFn: () => ventanasService.siguienteDocente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventana', id] });
      queryClient.invalidateQueries({ queryKey: ['cola', id] });
    },
  });

  const marcarAtendidoMutation = useMutation({
    mutationFn: (idDocente: number) => ventanasService.marcarAtendido(id, idDocente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventana', id] });
      queryClient.invalidateQueries({ queryKey: ['cola', id] });
    },
  });

  if (isLoading) return <SpinnerCarga />;
  if (!ventana) return <p>Ventana no encontrada</p>;

  const docenteActual = cola.data?.find((a: any) => a.estado === 'EN_PROCESO');
  const completados = cola.data?.filter((a: any) => a.estado === 'COMPLETADO').length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Atención de Ventana</h1>
      <div className="bg-white p-4 rounded shadow mb-4">
        <p><strong>Fecha:</strong> {new Date(ventana.fecha).toLocaleDateString('es-PE')}</p>
        <p><strong>Horario:</strong> {ventana.hora_inicio} - {ventana.hora_fin}</p>
        <p><strong>Categoría:</strong> {ventana.categoria} ({ventana.modalidad})</p>
        <p><strong>Estado:</strong> {ventana.estado}</p>
        <p><strong>Progreso:</strong> {completados} de {cola.data?.length || 0} docentes atendidos</p>
      </div>

      {ventana.estado === 'PENDIENTE' && (
        <Boton onClick={() => iniciarMutation.mutate()}>Iniciar Ventana</Boton>
      )}

      {ventana.estado === 'EN_PROCESO' && (
        <>
          {docenteActual ? (
            <div className="bg-green-50 p-4 rounded mb-4">
              <h2 className="text-lg font-semibold">Docente en Atención</h2>
              <p>{docenteActual.docente.nombres} {docenteActual.docente.apellidos}</p>
              <p className="text-sm text-gray-500">{docenteActual.docente.email}</p>
              <div className="flex gap-2 mt-2">
                <Boton onClick={() => marcarAtendidoMutation.mutate(docenteActual.id_docente)}>
                  Marcar Atendido
                </Boton>
                <Boton variante="secundario" onClick={() => siguienteMutation.mutate()}>
                  Siguiente Docente
                </Boton>
              </div>
            </div>
          ) : (
            <Boton onClick={() => siguienteMutation.mutate()}>Llamar Siguiente Docente</Boton>
          )}

          <h2 className="text-xl font-semibold mt-6">Cola de Atención</h2>
          <table className="w-full bg-white border mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Docente</th>
                <th className="px-4 py-2">Antigüedad</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cola.data?.map((a: any) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2">{a.orden_espera}</td>
                  <td className="px-4 py-2">{a.docente.nombres} {a.docente.apellidos}</td>
                  <td className="px-4 py-2">{a.docente.antiguedad} años</td>
                  <td className="px-4 py-2">{a.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {ventana.estado === 'COMPLETADO' && (
        <div className="bg-blue-50 p-4 rounded">Esta ventana ha finalizado.</div>
      )}
    </div>
  );
}