'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { useAuthStore } from '@/stores/auth.store';
import { Search, UserPlus, Mail, Phone, Briefcase, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function DocentesPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore(state => state.usuario);
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [docenteEditando, setDocenteEditando] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  
  const [formulario, setFormulario] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    modalidad: 'NOMBRADO',
    categoria: 'PRINCIPAL',
    antiguedad: 0,
    crear_usuario: false,
    password: '',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['docentes', buscar],
    queryFn: () => docentesService.listar({ buscar }).then(res => res.data),
  });

  const docentes = Array.isArray(response) ? response : response?.data || [];

  const crearMutation = useMutation({
    mutationFn: (datos: any) => docentesService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Docente creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al crear docente', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => docentesService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Docente actualizado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al actualizar docente', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => docentesService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
      setToast({ mensaje: 'Docente desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar docente', tipo: 'error' });
    },
  });

  const resetFormulario = () => {
    setFormulario({
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      modalidad: 'NOMBRADO',
      categoria: 'PRINCIPAL',
      antiguedad: 0,
      crear_usuario: false,
      password: '',
    });
    setDocenteEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (docente: any) => {
    setDocenteEditando(docente);
    setFormulario({
      nombres: docente.nombres,
      apellidos: docente.apellidos,
      email: docente.email,
      telefono: docente.telefono || '',
      modalidad: docente.modalidad,
      categoria: docente.categoria,
      antiguedad: docente.antiguedad,
      crear_usuario: false,
      password: '',
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (docenteEditando) {
      actualizarMutation.mutate({ id: docenteEditando.id, datos: formulario });
    } else {
      crearMutation.mutate(formulario);
    }
  };

  const columnas = [
    { 
      clave: 'nombre_completo', 
      titulo: 'Docente',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{item.apellidos}, {item.nombres}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Mail className="w-3 h-3" /> {item.email}
          </span>
        </div>
      )
    },
    { 
      clave: 'modalidad', 
      titulo: 'Modalidad',
      render: (item: any) => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
          item.modalidad === 'NOMBRADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
        }`}>
          {item.modalidad}
        </span>
      ),
    },
    { 
      clave: 'categoria', 
      titulo: 'Categoría',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{item.categoria}</span>
        </div>
      )
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (item: any) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
          item.activo ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.activo ? 'bg-green-500' : 'bg-red-500'}`} />
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Personal Docente</h1>
          <p className="text-slate-500 mt-1">Gestión integral de la plana docente y sus perfiles.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar docente..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-unt-primary/5 focus:border-unt-primary transition-all bg-white shadow-sm"
            />
          </div>
          {esAdmin && (
            <Boton onClick={abrirModalCrear} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Docente
            </Boton>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={docentes}
            loading={isLoading}
            alEditar={esAdmin ? abrirModalEditar : undefined}
            alEliminar={esAdmin ? (docente) => {
              if (confirm(`¿Está seguro de desactivar al docente "${docente.nombres} ${docente.apellidos}"?`)) {
                eliminarMutation.mutate(docente.id);
              }
            } : undefined}
          />
        </CardContent>
      </Card>

      <Modal 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)}
        titulo={docenteEditando ? 'Editar Perfil del Docente' : 'Registrar Nuevo Docente'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CampoTexto
              label="Nombres"
              placeholder="Ej: Juan"
              value={formulario.nombres}
              onChange={(e) => setFormulario({ ...formulario, nombres: e.target.value })}
              required
            />
            <CampoTexto
              label="Apellidos"
              placeholder="Ej: Pérez"
              value={formulario.apellidos}
              onChange={(e) => setFormulario({ ...formulario, apellidos: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CampoTexto
              label="Correo Electrónico"
              type="email"
              placeholder="juan.perez@unt.edu.pe"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              required
            />
            <CampoTexto
              label="Teléfono"
              placeholder="Ej: 987654321"
              value={formulario.telefono}
              onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <Selector
              label="Modalidad"
              value={formulario.modalidad}
              onChange={(e) => setFormulario({ ...formulario, modalidad: e.target.value })}
              opciones={[
                { valor: 'NOMBRADO', etiqueta: 'Nombrado' },
                { valor: 'CONTRATADO', etiqueta: 'Contratado' },
              ]}
            />
            <Selector
              label="Categoría"
              value={formulario.categoria}
              onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
              opciones={[
                { valor: 'PRINCIPAL', etiqueta: 'Principal' },
                { valor: 'ASOCIADO', etiqueta: 'Asociado' },
                { valor: 'AUXILIAR', etiqueta: 'Auxiliar' },
                { valor: 'JEFE_PRACTICA', etiqueta: 'Jefe de Práctica' },
              ]}
            />
          </div>

          {!docenteEditando && (
            <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="crear_usuario"
                  checked={formulario.crear_usuario}
                  onChange={(e) => setFormulario({ ...formulario, crear_usuario: e.target.checked })}
                  className="w-4 h-4 text-unt-primary rounded focus:ring-unt-primary"
                />
                <label htmlFor="crear_usuario" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Crear automáticamente cuenta de usuario
                </label>
              </div>
              
              {formulario.crear_usuario && (
                <CampoTexto
                  label="Contraseña Temporal"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formulario.password}
                  onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                  required
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={() => setModalAbierto(false)} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={crearMutation.isPending || actualizarMutation.isPending} className="rounded-xl px-8 shadow-md shadow-unt-primary/10">
              {docenteEditando ? 'Guardar Cambios' : 'Registrar Docente'}
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
