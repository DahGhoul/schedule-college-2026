'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Boton } from '@/components/ui/Boton';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

const columnas = [
  { clave: 'nombres', titulo: 'Nombres' },
  { clave: 'apellidos', titulo: 'Apellidos' },
  { clave: 'email', titulo: 'Correo' },
  {
    clave: 'modalidad',
    titulo: 'Modalidad',
    render: (item: any) => (
      <span className={`px-2 py-1 rounded text-xs ${item.modalidad === 'NOMBRADO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
        {item.modalidad}
      </span>
    ),
  },
  { clave: 'categoria', titulo: 'Categoría' },
  { clave: 'antiguedad', titulo: 'Antigüedad' },
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

export default function DocentesPage() {
  const queryClient = useQueryClient();
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

  const { data: docentes, isLoading } = useQuery({
    queryKey: ['docentes', buscar],
    queryFn: () => docentesService.listar({ buscar }).then(res => res.data),
  });

  const crearMutation = useMutation({
    mutationFn: (datos: any) => docentesService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Docente creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: () => {
      setToast({ mensaje: 'Error al crear docente', tipo: 'error' });
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
    onError: () => {
      setToast({ mensaje: 'Error al actualizar docente', tipo: 'error' });
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
    const datosParaEnviar: any = { ...formulario };
    if (!datosParaEnviar.crear_usuario) {
      delete datosParaEnviar.password;
    }
    if (docenteEditando) {
      actualizarMutation.mutate({ id: docenteEditando.id, datos: datosParaEnviar });
    } else {
      crearMutation.mutate(datosParaEnviar);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Docentes</h1>
          <p className="text-sm text-gray-500">Gestione el personal docente de la universidad.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar docente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unt-accent/30 focus:border-unt-accent transition-all bg-white shadow-sm"
          />
          <Boton onClick={abrirModalCrear}>
            Nuevo Docente
          </Boton>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12"><SpinnerCarga /></div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <TablaDatos
            columnas={columnas}
            datos={docentes || []}
            alEditar={abrirModalEditar}
            alEliminar={(docente) => {
              if (confirm('¿Está seguro de desactivar este docente?')) {
                eliminarMutation.mutate(docente.id);
              }
            }}
          />
        </div>
      )}

      {modalAbierto && (
        <Modal cerrar={() => setModalAbierto(false)}>
          <h2 className="text-xl font-bold mb-4">
            {docenteEditando ? 'Editar Docente' : 'Nuevo Docente'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              label="Nombres"
              value={formulario.nombres}
              onChange={(e) => setFormulario({ ...formulario, nombres: e.target.value })}
              required
            />
            <CampoTexto
              label="Apellidos"
              value={formulario.apellidos}
              onChange={(e) => setFormulario({ ...formulario, apellidos: e.target.value })}
              required
            />
            <CampoTexto
              label="Correo"
              type="email"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              required
            />
            <CampoTexto
              label="Teléfono"
              value={formulario.telefono}
              onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
            />
            <Selector
              label="Modalidad"
              opciones={[
                { valor: 'NOMBRADO', etiqueta: 'Nombrado' },
                { valor: 'CONTRATADO', etiqueta: 'Contratado' },
              ]}
              value={formulario.modalidad}
              onChange={(e) => setFormulario({ ...formulario, modalidad: e.target.value })}
              required
            />
            <Selector
              label="Categoría"
              opciones={[
                { valor: 'PRINCIPAL', etiqueta: 'Principal' },
                { valor: 'ASOCIADO', etiqueta: 'Asociado' },
                { valor: 'AUXILIAR', etiqueta: 'Auxiliar' },
                { valor: 'JEFE_PRACTICA', etiqueta: 'Jefe de Práctica' },
              ]}
              value={formulario.categoria}
              onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
              required
            />
            <CampoTexto
              label="Antigüedad (años)"
              type="number"
              min="0"
              value={formulario.antiguedad}
              onChange={(e) => setFormulario({ ...formulario, antiguedad: parseInt(e.target.value) || 0 })}
              required
            />
            {!docenteEditando && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formulario.crear_usuario}
                    onChange={(e) => setFormulario({ ...formulario, crear_usuario: e.target.checked })}
                  />
                  Crear usuario de acceso
                </label>
                {formulario.crear_usuario && (
                  <CampoTexto
                    label="Contraseña"
                    type="password"
                    value={formulario.password}
                    onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                    required
                  />
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Boton type="button" onClick={() => setModalAbierto(false)} variante="secundario">
                Cancelar
              </Boton>
              <Boton type="submit">
                {docenteEditando ? 'Guardar Cambios' : 'Crear Docente'}
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