'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '@/services/configuracion.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal'
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  descripcion: z.string().min(1, 'Requerido'),
  tipo: z.enum(['FERIADO', 'MANTENIMIENTO']),
});

type FormData = z.infer<typeof schema>;

export default function DiasNoLaborablesPage() {
  const queryClient = useQueryClient();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editarId, setEditarId] = useState<number | null>(null);

  const { data: dias, isLoading } = useQuery({
    queryKey: ['dias-no-laborables'],
    queryFn: async () => {
      const res = await configuracionService.listarDiasNoLaborables();
      return res.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const crearMutation = useMutation({
    mutationFn: (datos: FormData) => configuracionService.crearDiaNoLaborable(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias-no-laborables'] });
      setMostrarModal(false);
      reset();
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => configuracionService.eliminarDiaNoLaborable(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dias-no-laborables'] }),
  });

  const onSubmit = (datos: FormData) => crearMutation.mutate(datos);

  const columnas = [
    { clave: 'fecha', titulo: 'Fecha', render: (item: any) => new Date(item.fecha).toLocaleDateString('es-PE') },
    { clave: 'descripcion', titulo: 'Descripción' },
    { clave: 'tipo', titulo: 'Tipo' },
  ];

  if (isLoading) return <SpinnerCarga />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Días No Laborables</h1>
        <Boton onClick={() => setMostrarModal(true)}>Agregar Día</Boton>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={dias || []}
        alHacerClick={(item) => {
          if (confirm('¿Eliminar este día?')) eliminarMutation.mutate(item.id);
        }}
      />

      {mostrarModal && (
        <Modal cerrar={() => setMostrarModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
            <CampoTexto label="Fecha (YYYY-MM-DD)" {...register('fecha')} error={errors.fecha?.message} />
            <CampoTexto label="Descripción" {...register('descripcion')} error={errors.descripcion?.message} />
            <Selector
              label="Tipo"
              {...register('tipo')}
              opciones={[
                { valor: 'FERIADO', etiqueta: 'Feriado' },
                { valor: 'MANTENIMIENTO', etiqueta: 'Mantenimiento' },
              ]}
            />
            {crearMutation.isError && <NotificacionToast mensaje="Error al crear" tipo="error" />}
            <Boton type="submit" disabled={crearMutation.isPending}>Guardar</Boton>
          </form>
        </Modal>
      )}
    </div>
  );
}