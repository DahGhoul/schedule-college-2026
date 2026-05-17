'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '@/services/configuracion.service';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  FRANJA_INICIO: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  FRANJA_FIN: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  HORAS_MAX_DIARIAS: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 16, '1-16'),
  BLOQUEO_ALMUERZO_INICIO: z.string().regex(/^\d{2}:\d{2}$/),
  BLOQUEO_ALMUERZO_FIN: z.string().regex(/^\d{2}:\d{2}$/),
});

type FormData = z.infer<typeof schema>;

export default function RestriccionesPage() {
  const queryClient = useQueryClient();

  const { data: restricciones, isLoading } = useQuery({
    queryKey: ['restricciones'],
    queryFn: async () => {
      const res = await configuracionService.obtenerRestricciones();
      return res.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: restricciones ? {
      FRANJA_INICIO: restricciones.franjaInicio,
      FRANJA_FIN: restricciones.franjaFin,
      HORAS_MAX_DIARIAS: String(restricciones.horasMaximasDiarias),
      BLOQUEO_ALMUERZO_INICIO: restricciones.bloqueoAlmuerzoInicio,
      BLOQUEO_ALMUERZO_FIN: restricciones.bloqueoAlmuerzoFin,
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (datos: FormData) => configuracionService.actualizarRestricciones(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restricciones'] });
    },
  });

  const onSubmit = (datos: FormData) => mutation.mutate(datos);

  if (isLoading) return <SpinnerCarga />;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Restricciones Institucionales</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <CampoTexto label="Franja horaria inicio (HH:MM)" {...register('FRANJA_INICIO')} error={errors.FRANJA_INICIO?.message} />
        <CampoTexto label="Franja horaria fin (HH:MM)" {...register('FRANJA_FIN')} error={errors.FRANJA_FIN?.message} />
        <CampoTexto label="Horas máximas diarias por docente" type="number" {...register('HORAS_MAX_DIARIAS')} error={errors.HORAS_MAX_DIARIAS?.message} />
        <CampoTexto label="Bloqueo almuerzo inicio" {...register('BLOQUEO_ALMUERZO_INICIO')} error={errors.BLOQUEO_ALMUERZO_INICIO?.message} />
        <CampoTexto label="Bloqueo almuerzo fin" {...register('BLOQUEO_ALMUERZO_FIN')} error={errors.BLOQUEO_ALMUERZO_FIN?.message} />

        {mutation.isSuccess && <NotificacionToast mensaje="Restricciones actualizadas" tipo="exito" />}
        {mutation.isError && <NotificacionToast mensaje="Error al guardar" tipo="error" />}

        <Boton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Boton>
      </form>
    </div>
  );
}