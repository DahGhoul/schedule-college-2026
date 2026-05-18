'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ambientesService } from '@/services/ambientes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const columnas = [
  { clave: 'codigo', titulo: 'Código de Ambiente' },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    render: (item: any) => {
      const isLab = item.tipo === 'LABORATORIO';
      return (
        <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${isLab ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
          {item.tipo}
        </span>
      );
    },
  },
  { clave: 'capacidad', titulo: 'Capacidad', render: (item: any) => `${item.capacidad} personas` },
  { clave: 'piso', titulo: 'Piso', render: (item: any) => `${item.piso || '-'}° Piso` },
  { clave: 'equipamiento', titulo: 'Equipamiento', render: (item: any) => item.equipamiento || '-' },
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

export default function AmbientesPage() {
  const queryClient = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ambienteEditando, setAmbienteEditando] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [formulario, setFormulario] = useState({
    codigo: '',
    tipo: 'AULA',
    capacidad: 40,
    piso: '',
    equipamiento: '',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['ambientes'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const ambientes = response?.data || response || [];

  const datosFiltrados = ambientes.filter((a: any) => 
    a.codigo.toLowerCase().includes(buscar.toLowerCase()) ||
    (a.equipamiento && a.equipamiento.toLowerCase().includes(buscar.toLowerCase()))
  );

  const crearMutation = useMutation({
    mutationFn: (datos: any) => ambientesService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambientes'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Ambiente creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear ambiente', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => ambientesService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambientes'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Ambiente actualizado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al actualizar ambiente', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => ambientesService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambientes'] });
      setToast({ mensaje: 'Ambiente desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar ambiente', tipo: 'error' });
    },
  });

  const resetFormulario = () => {
    setFormulario({
      codigo: '',
      tipo: 'AULA',
      capacidad: 40,
      piso: '',
      equipamiento: '',
    });
    setAmbienteEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (ambiente: any) => {
    setAmbienteEditando(ambiente);
    setFormulario({
      codigo: ambiente.codigo,
      tipo: ambiente.tipo,
      capacidad: ambiente.capacidad,
      piso: ambiente.piso || '',
      equipamiento: ambiente.equipamiento || '',
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const datos = {
      ...formulario,
      piso: formulario.piso ? parseInt(formulario.piso) : null,
      capacidad: parseInt(formulario.capacidad as any),
    };
    if (ambienteEditando) {
      actualizarMutation.mutate({ id: ambienteEditando.id, datos });
    } else {
      crearMutation.mutate(datos);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Aulas y Laboratorios</h1>
          <p className="text-sm text-gray-500">Gestione la infraestructura física, capacidades y equipamiento para las clases.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar ambiente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
          <Boton onClick={abrirModalCrear}>
            Nuevo Ambiente
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
              alEliminar={(ambiente) => {
                if (confirm('¿Está seguro de desactivar este ambiente?')) {
                  eliminarMutation.mutate(ambiente.id);
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {modalAbierto && (
        <Modal cerrar={() => setModalAbierto(false)}>
          <h2 className="text-xl font-bold mb-4">
            {ambienteEditando ? 'Editar Ambiente' : 'Nuevo Ambiente'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              label="Código"
              value={formulario.codigo}
              onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}
              required
            />
            <Selector
              label="Tipo"
              opciones={[
                { valor: 'AULA', etiqueta: 'Aula' },
                { valor: 'LABORATORIO', etiqueta: 'Laboratorio' },
              ]}
              value={formulario.tipo}
              onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}
              required
            />
            <CampoTexto
              label="Capacidad"
              type="number"
              min="1"
              value={formulario.capacidad}
              onChange={(e) => setFormulario({ ...formulario, capacidad: parseInt(e.target.value) || 0 })}
              required
            />
            <CampoTexto
              label="Piso"
              type="number"
              value={formulario.piso}
              onChange={(e) => setFormulario({ ...formulario, piso: e.target.value })}
            />
            <CampoTexto
              label="Equipamiento"
              value={formulario.equipamiento}
              onChange={(e) => setFormulario({ ...formulario, equipamiento: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Boton type="button" onClick={() => setModalAbierto(false)} variante="secundario">
                Cancelar
              </Boton>
              <Boton type="submit">
                {ambienteEditando ? 'Guardar Cambios' : 'Crear Ambiente'}
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
