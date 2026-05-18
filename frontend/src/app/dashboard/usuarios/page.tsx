'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService, type Usuario } from '@/services/usuarios.service';
import { docentesService } from '@/services/docentes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { useAuthStore } from '@/stores/auth.store';

const columnas = [
  { clave: 'email', titulo: 'Correo' },
  { clave: 'rol', titulo: 'Rol' },
  {
    clave: 'activo',
    titulo: 'Estado',
    render: (item: any) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
  {
    clave: 'docente',
    titulo: 'Docente',
    render: (item: any) =>
      item.docente ? `${item.docente.nombres} ${item.docente.apellidos}` : 'Sin docente',
  },
];

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore(state => state.usuario);
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
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

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar({}).then(res => res.data),
  });

  const crearMutation = useMutation({
    mutationFn: (datos: any) => usuariosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Usuario creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear usuario', tipo: 'error' });
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
    onError: () => {
      setToast({ mensaje: 'Error al actualizar usuario', tipo: 'error' });
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
    if (usuarioEditando) {
      actualizarMutation.mutate({ id: usuarioEditando.id, datos: datosParaEnviar });
    } else {
      crearMutation.mutate(datosParaEnviar);
    }
  };

  if (!esAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">No tienes acceso</h2>
          <p className="text-gray-500">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestione los usuarios del sistema.</p>
        </div>
        <Boton onClick={abrirModalCrear}>Nuevo Usuario</Boton>
      </div>

      {loadingUsuarios ? (
        <div className="py-12"><SpinnerCarga /></div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <TablaDatos
            columnas={columnas}
            datos={usuarios || []}
            alEditar={abrirModalEditar}
            alEliminar={(usuario) => {
              if (confirm('¿Está seguro de desactivar este usuario?')) {
                eliminarMutation.mutate(usuario.id);
              }
            }}
          />
        </div>
      )}

      {modalAbierto && (
        <Modal cerrar={() => setModalAbierto(false)}>
          <h2 className="text-xl font-bold mb-4">
            {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              label="Correo Electrónico"
              type="email"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              required
            />
            <Selector
              label="Rol"
              opciones={[
                { valor: 'ADMINISTRADOR', etiqueta: 'Administrador' },
                { valor: 'DOCENTE', etiqueta: 'Docente' },
                { valor: 'COORDINADOR', etiqueta: 'Coordinador' },
              ]}
              value={formulario.rol}
              onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}
              required
            />
            <CampoTexto
              label={`Contraseña${usuarioEditando ? ' (opcional)' : ''}`}
              type="password"
              value={formulario.password}
              onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
              required={!usuarioEditando}
            />
            {formulario.rol === 'DOCENTE' && docentes && (
              <Selector
                label="Docente (opcional)"
                opciones={docentes.map((d: any) => ({
                  valor: String(d.id),
                  etiqueta: `${d.nombres} ${d.apellidos}`,
                }))}
                value={formulario.id_docente ? String(formulario.id_docente) : ''}
                onChange={(e) =>
                  setFormulario({ ...formulario, id_docente: e.target.value ? parseInt(e.target.value) : undefined })
                }
              />
            )}
            <div className="flex gap-3 justify-end">
              <Boton type="button" onClick={() => setModalAbierto(false)} variante="secundario">
                Cancelar
              </Boton>
              <Boton type="submit">
                {usuarioEditando ? 'Guardar Cambios' : 'Crear Usuario'}
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
