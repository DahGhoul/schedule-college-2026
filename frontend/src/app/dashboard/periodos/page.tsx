'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Calendar, Info, Clock } from 'lucide-react';
import { periodosService } from '@/services/periodos.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { cn } from '@/lib/utilidades';

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

  const { data: response, isLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res) => res.data),
  });

  const periodos = Array.isArray(response) ? response : response?.data || [];

  const datosFiltrados = periodos.filter((p: any) => 
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  const crearMutation = useMutation({
    mutationFn: (datos: any) => periodosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Período creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Error al crear período';
      setToast({ mensaje: msg, tipo: 'error' });
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
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Error al actualizar período';
      setToast({ mensaje: msg, tipo: 'error' });
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

  const columnas = [
    { 
      clave: 'nombre', 
      titulo: 'Período Académico',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Calendar className="w-4 h-4 text-unt-primary" />
          </div>
          <span className="font-bold text-slate-900">{item.nombre}</span>
        </div>
      )
    },
    { 
      clave: 'fecha_inicio', 
      titulo: 'Inicio / Fin',
      render: (item: any) => (
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{new Date(item.fecha_inicio).toLocaleDateString('es-PE')}</span>
          <span className="text-slate-300">→</span>
          <span>{new Date(item.fecha_fin).toLocaleDateString('es-PE')}</span>
        </div>
      )
    },
    {
      clave: 'estado',
      titulo: 'Estado Proceso',
      render: (item: any) => {
        let color = 'bg-slate-50 text-slate-600 border-slate-100';
        if (item.estado === 'ACTIVO') color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (item.estado === 'BORRADOR') color = 'bg-amber-50 text-amber-700 border-amber-100';
        if (item.estado === 'CERRADO') color = 'bg-rose-50 text-rose-700 border-rose-100';
        
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full mr-2",
              item.estado === 'ACTIVO' ? 'bg-emerald-500' : 
              item.estado === 'BORRADOR' ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            {item.estado}
          </span>
        );
      },
    },
    {
      clave: 'activo',
      titulo: 'Visibilidad',
      render: (item: any) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
          item.activo ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {item.activo ? 'Visible' : 'Oculto'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Períodos Académicos</h1>
          <p className="text-slate-500 mt-1">Configuración de ciclos y vigencia de la programación.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar período..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-unt-primary/5 focus:border-unt-primary transition-all bg-white shadow-sm"
            />
          </div>
          <Boton onClick={abrirModalCrear} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Período
          </Boton>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={datosFiltrados}
            loading={isLoading}
            alEditar={abrirModalEditar}
            alEliminar={(periodo) => {
              if (confirm(`¿Está seguro de desactivar el período "${periodo.nombre}"?`)) {
                eliminarMutation.mutate(periodo.id);
              }
            }}
          />
        </CardContent>
      </Card>

      <Modal 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)}
        titulo={periodoEditando ? 'Editar Período Académico' : 'Registrar Nuevo Período'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <CampoTexto
            label="Nombre del Período"
            placeholder="Ej: 2026-I"
            value={formulario.nombre}
            onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
            required
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CampoTexto
              label="Fecha de Inicio"
              type="date"
              value={formulario.fecha_inicio}
              onChange={(e) => setFormulario({ ...formulario, fecha_inicio: e.target.value })}
              required
            />
            <CampoTexto
              label="Fecha de Finalización"
              type="date"
              value={formulario.fecha_fin}
              onChange={(e) => setFormulario({ ...formulario, fecha_fin: e.target.value })}
              required
            />
          </div>

          <Selector 
            label="Estado Inicial" 
            value={formulario.estado} 
            onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}
            opciones={[
              { valor: 'BORRADOR', etiqueta: 'Borrador (Solo Admin)' },
              { valor: 'ACTIVO', etiqueta: 'Activo (Vigente)' },
              { valor: 'CERRADO', etiqueta: 'Cerrado (Histórico)' }
            ]}
          />

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={() => setModalAbierto(false)} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={crearMutation.isPending || actualizarMutation.isPending} className="rounded-xl px-8 shadow-md shadow-unt-primary/10">
              {periodoEditando ? 'Guardar Cambios' : 'Registrar Período'}
            </Boton>
          </div>
        </form>
      </Modal>

      {toast && (
        <NotificacionToast 
          mensaje={toast.mensaje} 
          tipo={toast.tipo === 'exito' ? 'exito' : 'error'} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
