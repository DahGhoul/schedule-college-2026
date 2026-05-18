 'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cursosService } from '@/services/cursos.service';
import { gruposService } from '@/services/grupos.service';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';

export default function CursosPage() {
  const [buscar, setBuscar] = useState('');
  const queryClient = useQueryClient();

  // Modal para crear grupos por curso
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<any | null>(null);

  // Modal para crear/editar curso
  const [mostrarModalCurso, setMostrarModalCurso] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<any | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['cursos', buscar],
    queryFn: () => cursosService.listar({ buscar }).then((res) => res.data),
  });

  const cursos = response?.data || response || [];

  const gruposQuery = useQuery({
    queryKey: ['grupos', cursoSeleccionado?.id],
    queryFn: () => gruposService.listarPorCurso(cursoSeleccionado.id).then((r) => r.data),
    enabled: !!cursoSeleccionado,
  });

  const schema = z.object({
    cantidad: z.coerce.number().int().min(1),
    capacidad_maxima: z.coerce.number().int().min(1).optional(),
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cantidad: 1, capacidad_maxima: 40 },
  });

  const crearMutation = useMutation({
    mutationFn: (datos: FormData) => {
      const payload: any = { capacidad_maxima: datos.capacidad_maxima, cantidad: datos.cantidad };
      return gruposService.crearPorCurso(cursoSeleccionado.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos', cursoSeleccionado?.id] });
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setMostrarModal(false);
      reset();
    },
  });

  const onSubmit = (datos: FormData) => crearMutation.mutate(datos);

  const cursoSchema = z.object({
    nombre: z.string().min(1),
    codigo: z.string().min(1),
    horas_teoria: z.number().int().min(0),
    horas_laboratorio: z.number().int().min(0),
    creditos: z.number().int().min(1),
  });

  type CursoFormData = z.infer<typeof cursoSchema>;

  const {
    register: registerCurso,
    handleSubmit: handleSubmitCurso,
    reset: resetCurso,
    formState: { errors: errorsCurso },
  } = useForm<CursoFormData>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nombre: '',
      codigo: '',
      horas_teoria: 0,
      horas_laboratorio: 0,
      creditos: 1,
    },
  });

  const guardarCursoMutation = useMutation({
    mutationFn: (datos: CursoFormData) => {
      if (cursoEditando) return cursosService.actualizar(cursoEditando.id, datos);
      return cursosService.crear(datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setMostrarModalCurso(false);
      setCursoEditando(null);
      resetCurso();
    },
  });

  const eliminarCursoMutation = useMutation({
    mutationFn: (id: number) => cursosService.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cursos'] }),
  });

  const abrirCrearCurso = () => {
    setCursoEditando(null);
    resetCurso({ nombre: '', codigo: '', horas_teoria: 0, horas_laboratorio: 0, creditos: 1 });
    setMostrarModalCurso(true);
  };

  const abrirEditarCurso = (curso: any) => {
    setCursoEditando(curso);
    resetCurso({
      nombre: curso.nombre,
      codigo: curso.codigo,
      horas_teoria: curso.horas_teoria ?? 0,
      horas_laboratorio: curso.horas_laboratorio ?? 0,
      creditos: curso.creditos ?? 1,
    });
    setMostrarModalCurso(true);
  };

  const columnas = [
    { clave: 'codigo', titulo: 'Código' },
    { clave: 'nombre', titulo: 'Asignatura' },
    { clave: 'creditos', titulo: 'Créditos', render: (item: any) => `${item.creditos} CR` },
    {
      clave: 'horas_teoria',
      titulo: 'Horas Teoría',
      render: (item: any) => `${item.horas_teoria} hrs`,
    },
    {
      clave: 'horas_laboratorio',
      titulo: 'Horas Laboratorio',
      render: (item: any) => `${item.horas_laboratorio} hrs`,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (item: any) => (
        <div className="flex gap-2">
          <Boton
            type="button"
            variante="primario"
            onClick={(event) => {
              event.stopPropagation();
              setCursoSeleccionado(item);
              setMostrarModal(true);
            }}
          >
            Grupos
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            onClick={(event) => {
              event.stopPropagation();
              abrirEditarCurso(item);
            }}
          >
            Editar
          </Boton>
          <Boton
            type="button"
            variante="peligro"
            onClick={(event) => {
              event.stopPropagation();
              if (confirm('¿Desactivar este curso?')) eliminarCursoMutation.mutate(item.id);
            }}
          >
            Desactivar
          </Boton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Cursos y Asignaturas</h1>
          <p className="text-sm text-gray-500">Gestione el catálogo de cursos, horas lectivas y ambientes asociados de la escuela.</p>
        </div>
        <div className="w-full sm:w-auto flex gap-2">
          <input
            type="text"
            placeholder="Buscar asignatura..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
          <Boton type="button" onClick={abrirCrearCurso}>Nuevo curso</Boton>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12"><SpinnerCarga /></div>
          ) : (
            <TablaDatos
              columnas={columnas}
              datos={cursos}
              alHacerClick={(item) => {
                setCursoSeleccionado(item);
                setMostrarModal(true);
              }}
            />
          )}
        </CardContent>
      </Card>
      {mostrarModal && cursoSeleccionado && (
        <Modal cerrar={() => { setMostrarModal(false); setCursoSeleccionado(null); }}>
          <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Grupos para {cursoSeleccionado.nombre} ({cursoSeleccionado.codigo})</h2>
            <div className="mb-4">
              <h3 className="font-medium">Grupos existentes</h3>
              <ul className="mt-2">
                {gruposQuery.isLoading ? <li>Cargando...</li> : (
                  (gruposQuery.data || []).map((g: any) => (
                    <li key={g.id}>Grupo {g.codigo_grupo} — Aforo: {g.capacidad_maxima}</li>
                  ))
                )}
              </ul>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <CampoTexto
                label="Cantidad de grupos"
                type="number"
                {...register('cantidad')}
                error={errors.cantidad?.message as any}
              />

              <CampoTexto
                label="Capacidad máxima (por grupo)"
                type="number"
                {...register('capacidad_maxima')}
                error={errors.capacidad_maxima?.message as any}
              />

              {crearMutation.isError && <NotificacionToast mensaje="Error al crear grupos" tipo="error" />}
              <div className="flex gap-2">
                <Boton type="submit" disabled={crearMutation.isPending}>Crear</Boton>
                <Boton variante="secundario" onClick={() => { setMostrarModal(false); setCursoSeleccionado(null); }}>Cerrar</Boton>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {mostrarModalCurso && (
        <Modal cerrar={() => { setMostrarModalCurso(false); setCursoEditando(null); }}>
          <form onSubmit={handleSubmitCurso((datos) => guardarCursoMutation.mutate(datos))} className="space-y-4 p-4">
            <h2 className="text-lg font-bold">{cursoEditando ? 'Editar curso' : 'Nuevo curso'}</h2>
            <CampoTexto label="Código" {...registerCurso('codigo')} error={errorsCurso.codigo?.message} />
            <CampoTexto label="Nombre" {...registerCurso('nombre')} error={errorsCurso.nombre?.message} />
            <CampoTexto label="Horas teoría" type="number" {...registerCurso('horas_teoria')} error={errorsCurso.horas_teoria?.message as any} />
            <CampoTexto label="Horas laboratorio" type="number" {...registerCurso('horas_laboratorio')} error={errorsCurso.horas_laboratorio?.message as any} />
            <CampoTexto label="Créditos" type="number" {...registerCurso('creditos')} error={errorsCurso.creditos?.message as any} />

            {guardarCursoMutation.isError && <NotificacionToast mensaje="Error al guardar el curso" tipo="error" />}
            <div className="flex gap-2">
              <Boton type="submit" disabled={guardarCursoMutation.isPending}>Guardar</Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={() => { setMostrarModalCurso(false); setCursoEditando(null); }}
              >
                Cancelar
              </Boton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
