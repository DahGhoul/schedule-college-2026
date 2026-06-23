'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Search, Plus, BookOpen, Hash, Layers, FileText } from 'lucide-react';
import { cursosService } from '@/services/cursos.service';
import { curriculaService } from '@/services/curricula.service';
import { useAuthStore } from '@/stores/auth.store';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const cursoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  codigo: z.string().min(1, 'El código es obligatorio'),
  creditos: z.coerce.number().int().min(1, 'Debe ser al menos 1'),
  id_curricula: z.number().int().positive().nullable().optional(),
});

type CursoFormData = z.infer<typeof cursoSchema>;

export default function CursosPage() {
  const queryClient = useQueryClient();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  const [buscar, setBuscar] = useState('');
  const [idCurriculaFiltro, setIdCurriculaFiltro] = useState<number | undefined>(undefined);
  const [mostrarModalCurso, setMostrarModalCurso] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<any | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null);

  const { data: curriculaList } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculaService.listar().then((res) => res.data),
  });

  const curriculaOpts = Array.isArray(curriculaList) ? curriculaList : curriculaList?.data || [];

  const { data: response, isLoading } = useQuery({
    queryKey: ['cursos', buscar, idCurriculaFiltro],
    queryFn: () => cursosService.listar({ buscar, id_curricula: idCurriculaFiltro }).then((res) => res.data),
  });

  const cursos = Array.isArray(response) ? response : response?.data || [];

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
      creditos: 1,
      id_curricula: null,
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
      setToast({ 
        mensaje: cursoEditando ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente', 
        tipo: 'exito' 
      });
      cerrarModalCurso();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Error al guardar el curso';
      setToast({ mensaje: msg, tipo: 'error' });
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

  const abrirCrearCurso = () => {
    setCursoEditando(null);
    resetCurso({
      nombre: '',
      codigo: '',
      creditos: 1,
      id_curricula: null,
    });
    setMostrarModalCurso(true);
  };

  const abrirEditarCurso = (curso: any) => {
    setCursoEditando(curso);
    resetCurso({
      nombre: curso.nombre ?? '',
      codigo: curso.codigo ?? '',
      creditos: curso.creditos ?? 1,
      id_curricula: curso.id_curricula ?? null,
    });
    setMostrarModalCurso(true);
  };

  const cerrarModalCurso = () => {
    setMostrarModalCurso(false);
    setCursoEditando(null);
    resetCurso();
  };

  const columnas = [
    { 
      clave: 'codigo', 
      titulo: 'Código',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold text-slate-900">{item.codigo}</span>
        </div>
      )
    },
    { 
      clave: 'nombre', 
      titulo: 'Asignatura',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-unt-primary/60" />
          <span className="font-medium text-slate-800">{item.nombre}</span>
        </div>
      )
    },
    { 
      clave: 'creditos', 
      titulo: 'Créditos', 
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-600">
            {item.creditos} CR
          </span>
        </div>
      )
    },
    {
      clave: 'curricula',
      titulo: 'Currícula',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          {item.curricula ? (
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.curricula.vigente ? 'bg-unt-primary/10 text-unt-primary' : 'bg-slate-100 text-slate-500'}`}>
              {item.curricula.nombre}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Sin asignar</span>
          )}
        </div>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (item: any) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
            item.activo 
              ? 'bg-green-50 text-green-700 border border-green-100' 
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.activo ? 'bg-green-500' : 'bg-red-500'}`} />
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cursos y Asignaturas</h1>
          <p className="text-slate-500 mt-1">Gestiona el catálogo de cursos activos de la escuela.</p>
        </div>

        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:flex-nowrap items-end">
          <div className="w-full sm:w-48">
            <Selector
              label="Currícula"
              value={idCurriculaFiltro ?? ''}
              onChange={(e) => setIdCurriculaFiltro(e.target.value ? Number(e.target.value) : undefined)}
              opciones={[
                { valor: '', etiqueta: 'Vigente (predet.)' },
                { valor: '0', etiqueta: 'Sin currícula' },
                ...(curriculaOpts.map((c: any) => ({
                  valor: String(c.id),
                  etiqueta: `${c.nombre}${c.vigente ? ' (Vigente)' : ''}`
                })))
              ]}
            />
          </div>
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm transition-all focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none"
            />
          </div>
          {esAdmin && (
            <Boton onClick={abrirCrearCurso} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo curso
            </Boton>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos 
            columnas={columnas} 
            datos={cursos} 
            loading={isLoading}
            alEditar={esAdmin ? abrirEditarCurso : undefined}
            alEliminar={esAdmin ? (item) => {
              if (window.confirm(`¿Estás seguro de desactivar el curso "${item.nombre}"?`)) {
                eliminarCursoMutation.mutate(item.id);
              }
            } : undefined}
          />
        </CardContent>
      </Card>

      <Modal 
        isOpen={mostrarModalCurso} 
        onClose={cerrarModalCurso}
        titulo={cursoEditando ? 'Editar Curso' : 'Registrar Nuevo Curso'}
      >
        <form onSubmit={handleSubmitCurso((datos) => guardarCursoMutation.mutate(datos))} className="space-y-6">
          <div className="grid gap-6">
            <CampoTexto 
              label="Código de Asignatura" 
              placeholder="Ej: INF-123"
              {...registerCurso('codigo')} 
              error={erroresCurso.codigo?.message} 
            />
            <CampoTexto 
              label="Nombre de Asignatura" 
              placeholder="Ej: Ingeniería de Software"
              {...registerCurso('nombre')} 
              error={erroresCurso.nombre?.message} 
            />
            <CampoTexto 
              label="Número de Créditos" 
              type="number" 
              min="1" 
              max="10"
              {...registerCurso('creditos')} 
              error={erroresCurso.creditos?.message} 
            />
            <Selector
              label="Currícula"
              error={erroresCurso.id_curricula?.message}
              opciones={[
                { valor: '', etiqueta: '-- Sin asignar --' },
                ...(curriculaOpts.map((c: any) => ({
                  valor: String(c.id),
                  etiqueta: `${c.nombre}${c.vigente ? ' (Vigente)' : ''}`
                })))
              ]}
              {...registerCurso('id_curricula', { valueAsNumber: true })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={cerrarModalCurso} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={guardarCursoMutation.isPending} className="rounded-xl px-8 shadow-md shadow-unt-primary/10">
              {cursoEditando ? 'Actualizar Curso' : 'Crear Curso'}
            </Boton>
          </div>
        </form>
      </Modal>

      {toast && (
        <NotificacionToast 
          mensaje={toast.mensaje} 
          tipo={toast.tipo} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
