'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cursosService } from '@/services/cursos.service';
import { gruposService } from '@/services/grupos.service';
import { useAuthStore } from '@/stores/auth.store';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const cursoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  codigo: z.string().min(1, 'El código es obligatorio'),
  horas_teoria: z.coerce.number().int().min(0, 'Debe ser un número válido'),
  horas_practica: z.coerce.number().int().min(0, 'Debe ser un número válido'),
  horas_laboratorio: z.coerce.number().int().min(0, 'Debe ser un número válido'),
  creditos: z.coerce.number().int().min(1, 'Debe ser al menos 1'),
});

type CursoFormData = z.infer<typeof cursoSchema>;

const gruposSchema = z.object({
  cantidad: z.coerce.number().int().min(1, 'Debe crear al menos un grupo'),
  capacidad_maxima: z.coerce.number().int().min(1).optional(),
});

type GruposFormData = z.infer<typeof gruposSchema>;

export default function CursosPage() {
  const queryClient = useQueryClient();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  const [buscar, setBuscar] = useState('');
  const [mostrarModalCurso, setMostrarModalCurso] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<any | null>(null);
  const [mostrarModalGrupos, setMostrarModalGrupos] = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<any | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['cursos', buscar],
    queryFn: () => cursosService.listar({ buscar }).then((res) => res.data),
  });

  const cursos = Array.isArray(response) ? response : response?.data || [];

  const gruposQuery = useQuery({
    queryKey: ['grupos', cursoSeleccionado?.id],
    queryFn: () => gruposService.listarPorCurso(cursoSeleccionado.id).then((res) => res.data),
    enabled: !!cursoSeleccionado,
  });

  const {
    register: registerCurso,
    handleSubmit: handleSubmitCurso,
    reset: resetCurso,
    formState: { errors: erroresCurso },
  } = useForm<CursoFormData>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nombre: '',
      codigo: '',
      horas_teoria: 0,
      horas_practica: 0,
      horas_laboratorio: 0,
      creditos: 1,
    },
  });

  const {
    register: registerGrupos,
    handleSubmit: handleSubmitGrupos,
    reset: resetGrupos,
    formState: { errors: erroresGrupos },
  } = useForm<GruposFormData>({
    resolver: zodResolver(gruposSchema),
    defaultValues: {
      cantidad: 1,
      capacidad_maxima: 40,
    },
  });

  const guardarCursoMutation = useMutation({
    mutationFn: (datos: CursoFormData) => {
      if (cursoEditando) {
        return cursosService.actualizar(cursoEditando.id, datos);
      }

      return cursosService.crear(datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setToast({ mensaje: cursoEditando ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente', tipo: 'exito' });
      setMostrarModalCurso(false);
      setCursoEditando(null);
      resetCurso();
    },
    onError: () => {
      setToast({ mensaje: 'Error al guardar el curso', tipo: 'error' });
    },
  });

  const eliminarCursoMutation = useMutation({
    mutationFn: (id: number) => cursosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setToast({ mensaje: 'Curso desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar curso', tipo: 'error' });
    },
  });

  const crearGruposMutation = useMutation({
    mutationFn: (datos: GruposFormData) => {
      if (!cursoSeleccionado) {
        throw new Error('No hay curso seleccionado');
      }

      return gruposService.crearPorCurso(cursoSeleccionado.id, datos);
    },
    onSuccess: () => {
      if (cursoSeleccionado) {
        queryClient.invalidateQueries({ queryKey: ['grupos', cursoSeleccionado.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setToast({ mensaje: 'Grupos creados correctamente', tipo: 'exito' });
      resetGrupos({ cantidad: 1, capacidad_maxima: 40 });
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear los grupos', tipo: 'error' });
    },
  });

  const abrirCrearCurso = () => {
    setCursoEditando(null);
    resetCurso({
      nombre: '',
      codigo: '',
      horas_teoria: 0,
      horas_practica: 0,
      horas_laboratorio: 0,
      creditos: 1,
    });
    setMostrarModalCurso(true);
  };

  const abrirEditarCurso = (curso: any) => {
    setCursoEditando(curso);
    resetCurso({
      nombre: curso.nombre ?? '',
      codigo: curso.codigo ?? '',
      horas_teoria: curso.horas_teoria ?? 0,
      horas_practica: curso.horas_practica ?? 0,
      horas_laboratorio: curso.horas_laboratorio ?? 0,
      creditos: curso.creditos ?? 1,
    });
    setMostrarModalCurso(true);
  };

  const abrirGruposCurso = (curso: any) => {
    setCursoSeleccionado(curso);
    setMostrarModalGrupos(true);
    resetGrupos({ cantidad: 1, capacidad_maxima: 40 });
  };

  const cerrarModalCurso = () => {
    setMostrarModalCurso(false);
    setCursoEditando(null);
    resetCurso();
  };

  const cerrarModalGrupos = () => {
    setMostrarModalGrupos(false);
    setCursoSeleccionado(null);
    resetGrupos({ cantidad: 1, capacidad_maxima: 40 });
  };

  const columnas = [
    { clave: 'codigo', titulo: 'Código' },
    { clave: 'nombre', titulo: 'Asignatura' },
    { clave: 'creditos', titulo: 'Créditos', render: (item: any) => `${item.creditos} CR` },
    { clave: 'horas_teoria', titulo: 'Horas Teoría', render: (item: any) => `${item.horas_teoria} hrs` },
    { clave: 'horas_practica', titulo: 'Horas Práctica', render: (item: any) => `${item.horas_practica} hrs` },
    { clave: 'horas_laboratorio', titulo: 'Horas Laboratorio', render: (item: any) => `${item.horas_laboratorio} hrs` },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (item: any) => (
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (item: any) => (
        <div className="flex flex-wrap gap-2">
          <Boton
            type="button"
            variante="primario"
            onClick={(event) => {
              event.stopPropagation();
              abrirGruposCurso(item);
            }}
          >
            Grupos
          </Boton>

          {esAdmin && (
            <>
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
                  if (window.confirm('¿Desactivar este curso?')) {
                    eliminarCursoMutation.mutate(item.id);
                  }
                }}
              >
                Desactivar
              </Boton>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">Cursos y Asignaturas</h1>
          <p className="text-sm text-gray-500">Gestiona el catálogo de cursos, horas lectivas y grupos asociados de la escuela.</p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <input
            type="text"
            placeholder="Buscar asignatura..."
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm transition-all focus:border-unt-accent focus:outline-none focus:ring-2 focus:ring-unt-accent/30 sm:w-72"
          />
          {esAdmin && (
            <Boton type="button" onClick={abrirCrearCurso}>
              Nuevo curso
            </Boton>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12">
              <SpinnerCarga />
            </div>
          ) : (
            <TablaDatos columnas={columnas} datos={cursos} />
          )}
        </CardContent>
      </Card>

      {mostrarModalGrupos && cursoSeleccionado && (
        <Modal cerrar={cerrarModalGrupos}>
          <div className="space-y-5 p-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Grupos para {cursoSeleccionado.nombre} ({cursoSeleccionado.codigo})
              </h2>
              <p className="text-sm text-gray-500">Crea varios grupos de una sola vez y revisa los grupos existentes.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Grupos existentes</h3>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {gruposQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Cargando grupos...</p>
                ) : (gruposQuery.data || []).length > 0 ? (
                  (gruposQuery.data || []).map((grupo: any) => (
                    <div key={grupo.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold">Grupo {grupo.codigo_grupo}</span> - Aforo: {grupo.capacidad_maxima}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Todavía no hay grupos creados para este curso.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitGrupos((datos) => crearGruposMutation.mutate(datos))} className="space-y-4">
              <CampoTexto label="Cantidad de grupos" type="number" min="1" {...registerGrupos('cantidad')} error={erroresGrupos.cantidad?.message} />
              <CampoTexto
                label="Capacidad máxima por grupo"
                type="number"
                min="1"
                {...registerGrupos('capacidad_maxima')}
                error={erroresGrupos.capacidad_maxima?.message}
              />

              <div className="flex gap-2 pt-2">
                <Boton type="submit" cargando={crearGruposMutation.isPending}>
                  Crear grupos
                </Boton>
                <Boton type="button" variante="secundario" onClick={cerrarModalGrupos}>
                  Cerrar
                </Boton>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {mostrarModalCurso && (
        <Modal cerrar={cerrarModalCurso}>
          <form onSubmit={handleSubmitCurso((datos) => guardarCursoMutation.mutate(datos))} className="space-y-4 p-1">
            <h2 className="text-xl font-bold text-gray-900">{cursoEditando ? 'Editar curso' : 'Nuevo curso'}</h2>
            <CampoTexto label="Código" {...registerCurso('codigo')} error={erroresCurso.codigo?.message} />
            <CampoTexto label="Nombre" {...registerCurso('nombre')} error={erroresCurso.nombre?.message} />
            <CampoTexto label="Horas teoría" type="number" min="0" {...registerCurso('horas_teoria')} error={erroresCurso.horas_teoria?.message} />
            <CampoTexto label="Horas práctica" type="number" min="0" {...registerCurso('horas_practica')} error={erroresCurso.horas_practica?.message} />
            <CampoTexto label="Horas laboratorio" type="number" min="0" {...registerCurso('horas_laboratorio')} error={erroresCurso.horas_laboratorio?.message} />
            <CampoTexto label="Créditos" type="number" min="1" {...registerCurso('creditos')} error={erroresCurso.creditos?.message} />

            <div className="flex gap-2 pt-2">
              <Boton type="submit" cargando={guardarCursoMutation.isPending}>
                Guardar
              </Boton>
              <Boton type="button" variante="secundario" onClick={cerrarModalCurso}>
                Cancelar
              </Boton>
            </div>
          </form>
        </Modal>
      )}

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
