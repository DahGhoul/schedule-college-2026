'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const columnas = [
  { clave: 'nombre', titulo: 'Nombre' },
  { 
    clave: 'fecha_inicio', 
    titulo: 'Fecha de Inicio',
    render: (item: any) => new Date(item.fecha_inicio).toLocaleDateString('es-PE')
  },
  { 
    clave: 'fecha_fin', 
    titulo: 'Fecha de Fin',
    render: (item: any) => new Date(item.fecha_fin).toLocaleDateString('es-PE')
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (item: any) => {
      let bg = 'bg-gray-100 text-gray-800';
      if (item.estado === 'ACTIVO') bg = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      if (item.estado === 'BORRADOR') bg = 'bg-amber-100 text-amber-800 border border-amber-200';
      if (item.estado === 'CERRADO') bg = 'bg-rose-100 text-rose-800 border border-rose-200';
      
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${bg}`}>
          {item.estado}
        </span>
      );
    },
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

export default function PeriodosPage() {
  const queryClient = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [periodoEditando, setPeriodoEditando] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [formulario, setFormulario] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'BORRADOR',
  });

  const { data: periodos, isLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const datosFiltrados = periodos?.filter((p: any) => 
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  ) || [];

  const crearMutation = useMutation({
    mutationFn: (datos: any) => periodosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Período creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear período', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => periodosService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Período actualizado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al actualizar período', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => periodosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      setToast({ mensaje: 'Período desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar período', tipo: 'error' });
    },
  });

  const resetFormulario = () => {
    setFormulario({
      nombre: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'BORRADOR',
    });
    setPeriodoEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (periodo: any) => {
    setPeriodoEditando(periodo);
    setFormulario({
      nombre: periodo.nombre,
      fecha_inicio: periodo.fecha_inicio.split('T')[0],
      fecha_fin: periodo.fecha_fin.split('T')[0],
      estado: periodo.estado,
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (periodoEditando) {
      actualizarMutation.mutate({ id: periodoEditando.id, datos: formulario });
    } else {
      crearMutation.mutate(formulario);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Períodos Académicos</h1>
          <p className="text-sm text-gray-500">Gestione los períodos académicos activos y cerrados para la programación horaria.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar período..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
          <Boton onClick={abrirModalCrear}>
            Nuevo Período
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
              datos={datosFiltrados}
              alEditar={abrirModalEditar}
              alEliminar={(periodo) => {
                if (confirm('¿Está seguro de desactivar este período?')) {
                  eliminarMutation.mutate(periodo.id);
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {modalAbierto && (
        <Modal cerrar={() => setModalAbierto(false)}>
          <h2 className="text-xl font-bold mb-4">
            {periodoEditando ? 'Editar Período' : 'Nuevo Período'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              label="Nombre"
              placeholder="ej: 2026-I"
              value={formulario.nombre}
              onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              required
            />
            <CampoTexto
              label="Fecha de Inicio"
              type="date"
              value={formulario.fecha_inicio}
              onChange={(e) => setFormulario({ ...formulario, fecha_inicio: e.target.value })}
              required
            />
            <CampoTexto
              label="Fecha de Fin"
              type="date"
              value={formulario.fecha_fin}
              onChange={(e) => setFormulario({ ...formulario, fecha_fin: e.target.value })}
              required
            />
            <Selector
              label="Estado"
              opciones={[
                { valor: 'BORRADOR', etiqueta: 'Borrador' },
                { valor: 'ACTIVO', etiqueta: 'Activo' },
                { valor: 'CERRADO', etiqueta: 'Cerrado' },
              ]}
              value={formulario.estado}
              onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Boton type="button" onClick={() => setModalAbierto(false)} variante="secundario">
                Cancelar
              </Boton>
              <Boton type="submit">
                {periodoEditando ? 'Guardar Cambios' : 'Crear Período'}
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
