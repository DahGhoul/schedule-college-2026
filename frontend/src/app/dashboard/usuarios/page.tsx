'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService, type Usuario } from '@/services/usuarios.service';
import { docentesService } from '@/services/docentes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { useAuthStore } from '@/stores/auth.store';
import { Search, UserPlus, Mail, Shield, UserCircle, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const usuarioActual = useAuthStore(state => state.usuario);
  const esAdmin = usuarioActual?.rol === 'ADMINISTRADOR';
  
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  
  const [formulario, setFormulario] = useState({
    email: '',
    rol: 'DOCENTE',
    password: '',
    id_docente: undefined as number | undefined,
  });

  const { data: usuarios, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosService.listar(),
  });

  const { data: responseDocentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar({}).then(res => res.data),
  });

  const docentes = Array.isArray(responseDocentes) ? responseDocentes : responseDocentes?.data || [];

  const crearMutation = useMutation({
    mutationFn: (datos: any) => usuariosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Usuario creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al crear usuario', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => usuariosService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Usuario actualizado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al actualizar usuario', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => usuariosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setToast({ mensaje: 'Usuario desactivado exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar usuario', tipo: 'error' });
    },
  });

  const resetFormulario = () => {
    setFormulario({
      email: '',
      rol: 'DOCENTE',
      password: '',
      id_docente: undefined,
    });
    setUsuarioEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setFormulario({
      email: usuario.email,
      rol: usuario.rol,
      password: '',
      id_docente: usuario.id_docente ?? undefined,
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const datosParaEnviar: any = { ...formulario };
    if (!datosParaEnviar.password) {
      delete datosParaEnviar.password;
    }
    
    // Asegurar que id_docente sea null si no se selecciona nada
    if (datosParaEnviar.id_docente === 0 || datosParaEnviar.id_docente === '0') {
      datosParaEnviar.id_docente = null;
    } else if (datosParaEnviar.id_docente) {
      datosParaEnviar.id_docente = parseInt(datosParaEnviar.id_docente as any);
    }

    if (usuarioEditando) {
      actualizarMutation.mutate({ id: usuarioEditando.id, datos: datosParaEnviar });
    } else {
      crearMutation.mutate(datosParaEnviar);
    }
  };

  const columnas = [
    { 
      clave: 'email', 
      titulo: 'Usuario / Correo',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Mail className="w-4 h-4 text-slate-500" />
          </div>
          <span className="font-medium text-slate-900">{item.email}</span>
        </div>
      )
    },
    { 
      clave: 'rol', 
      titulo: 'Rol de Acceso',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-unt-primary/60" />
          <span className="px-3 py-1 bg-unt-primary/5 text-unt-primary rounded-full text-xs font-bold uppercase">
            {item.rol}
          </span>
        </div>
      )
    },
    {
      clave: 'docente',
      titulo: 'Personal Vinculado',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">
            {item.docente ? `${item.docente.nombres} ${item.docente.apellidos}` : 'Sin vinculación'}
          </span>
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

  if (!esAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 rounded-full">
          <Shield className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acceso Denegado</h2>
        <p className="text-slate-500">Solo administradores del sistema pueden gestionar cuentas de usuario.</p>
      </div>
    );
  }

  const usuariosFiltrados = (usuarios || []).filter(u => 
    u.email.toLowerCase().includes(buscar.toLowerCase()) ||
    u.rol.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cuentas de Usuario</h1>
          <p className="text-slate-500 mt-1">Gestión de accesos, roles y seguridad del sistema.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-unt-primary/5 focus:border-unt-primary transition-all bg-white shadow-sm"
            />
          </div>
          <Boton onClick={abrirModalCrear} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Boton>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={usuariosFiltrados}
            loading={loadingUsuarios}
            alEditar={abrirModalEditar}
            alEliminar={(usuario) => {
              if (confirm(`¿Está seguro de desactivar la cuenta "${usuario.email}"?`)) {
                eliminarMutation.mutate(usuario.id);
              }
            }}
          />
        </CardContent>
      </Card>

      <Modal 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)}
        titulo={usuarioEditando ? 'Editar Cuenta de Usuario' : 'Registrar Nueva Cuenta'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            <CampoTexto
              label="Correo Electrónico"
              type="email"
              placeholder="ejemplo@unt.edu.pe"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              required
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Selector
                label="Rol de Usuario"
                opciones={[
                  { valor: 'ADMINISTRADOR', etiqueta: 'Administrador' },
                  { valor: 'DIRECTOR', etiqueta: 'Director de Escuela' },
                  { valor: 'SECRETARIA', etiqueta: 'Secretaría' },
                  { valor: 'DOCENTE', etiqueta: 'Docente' },
                ]}
                value={formulario.rol}
                onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}
                required
              />

              <CampoTexto
                label={usuarioEditando ? 'Cambiar Contraseña' : 'Contraseña'}
                type="password"
                placeholder={usuarioEditando ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                value={formulario.password}
                onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                required={!usuarioEditando}
              />
            </div>

            <Selector
              label="Vincular con Docente (Opcional)"
              value={formulario.id_docente || ''}
              onChange={(e) => setFormulario({ ...formulario, id_docente: e.target.value ? parseInt(e.target.value) : undefined })}
            >
              <option value="">Ninguno / Usuario Administrativo</option>
              {docentes.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </option>
              ))}
            </Selector>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={() => setModalAbierto(false)} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={crearMutation.isPending || actualizarMutation.isPending} className="rounded-xl px-8 shadow-md shadow-unt-primary/10">
              {usuarioEditando ? 'Actualizar Cuenta' : 'Crear Usuario'}
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
