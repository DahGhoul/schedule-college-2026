'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cursosService } from '@/services/cursos.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const columnas = [
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'nombre', titulo: 'Asignatura' },
  { clave: 'creditos', titulo: 'Créditos', render: (item: any) => `${item.creditos} CR` },
  { 
    clave: 'horas_teoria', 
    titulo: 'Horas Teoría',
    render: (item: any) => `${item.horas_teoria} hrs`
  },
  { 
    clave: 'horas_laboratorio', 
    titulo: 'Horas Laboratorio',
    render: (item: any) => `${item.horas_laboratorio} hrs`
  },
  {
    clave: 'activo',
    titulo: 'Estado',
    render: (item: any) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
];

export default function CursosPage() {
  const queryClient = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [formulario, setFormulario] = useState({
    nombre: '',
    codigo: '',
    horas_teoria: 0,
    horas_laboratorio: 0,
    creditos: 1,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['cursos', buscar],
    queryFn: () => cursosService.listar({ buscar }).then((res) => res.data),
  });

  const cursos = response?.data || response || [];

  const crearMutation = useMutation({
    mutationFn: (datos: any) => cursosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Curso creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear curso', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => cursosService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Curso actualizado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al actualizar curso', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => cursosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      setToast({ mensaje: 'Curso desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar curso', tipo: 'error' });
    },
  });

  const resetFormulario = () => {
    setFormulario({
      nombre: '',
      codigo: '',
      horas_teoria: 0,
      horas_laboratorio: 0,
      creditos: 1,
    });
    setCursoEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (curso: any) => {
    setCursoEditando(curso);
    setFormulario({
      nombre: curso.nombre,
      codigo: curso.codigo,
      horas_teoria: curso.horas_teoria,
      horas_laboratorio: curso.horas_laboratorio,
      creditos: curso.creditos,
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const datos = {
      ...formulario,
      horas_teoria: parseInt(formulario.horas_teoria as any),
      horas_laboratorio: parseInt(formulario.horas_laboratorio as any),
      creditos: parseInt(formulario.creditos as any),
    };
    if (cursoEditando) {
      actualizarMutation.mutate({ id: cursoEditando.id, datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Cursos y Asignaturas</h1>
          <p className="text-sm text-gray-500">Gestione el catálogo de cursos, horas lectivas y ambientes asociados de la escuela.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar asignatura..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
          <Boton onClick={abrirModalCrear}>
            Nuevo Curso
          </Boton>
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
              alEditar={abrirModalEditar}
              alEliminar={(curso) => {
                if (confirm('¿Está seguro de desactivar este curso?')) {
                  eliminarMutation.mutate(curso.id);
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {modalAbierto && (
        <Modal cerrar={() => setModalAbierto(false)}>
          <h2 className="text-xl font-bold mb-4">
            {cursoEditando ? 'Editar Curso' : 'Nuevo Curso'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              label="Nombre"
              value={formulario.nombre}
              onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              required
            />
            <CampoTexto
              label="Código"
              value={formulario.codigo}
              onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}
              required
            />
            <CampoTexto
              label="Horas de Teoría"
              type="number"
              min="0"
              value={formulario.horas_teoria}
              onChange={(e) => setFormulario({ ...formulario, horas_teoria: parseInt(e.target.value) || 0 })}
              required
            />
            <CampoTexto
              label="Horas de Laboratorio"
              type="number"
              min="0"
              value={formulario.horas_laboratorio}
              onChange={(e) => setFormulario({ ...formulario, horas_laboratorio: parseInt(e.target.value) || 0 })}
              required
            />
            <CampoTexto
              label="Créditos"
              type="number"
              min="1"
              value={formulario.creditos}
              onChange={(e) => setFormulario({ ...formulario, creditos: parseInt(e.target.value) || 1 })}
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Boton type="button" onClick={() => setModalAbierto(false)} variante="secundario">
                Cancelar
              </Boton>
              <Boton type="submit">
                {cursoEditando ? 'Guardar Cambios' : 'Crear Curso'}
              </Boton>
            </div>
          </form>
        </Modal>
      )}

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
