'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docentesService } from '@/services/docentes.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { Modal } from '@/components/ui/Modal';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { UserPlus, Search, Mail, Phone, Briefcase, GraduationCap, Calendar, Edit2, Users } from 'lucide-react';

export default function GestionDocentesPage() {
  const queryClient = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    codigo_ibm: '',
    dni: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    empleo: '',
    modalidad: 'NOMBRADO',
    categoria: 'PRINCIPAL',
    dedicacion: 'TIEMPO_COMPLETO_40H',
    antiguedad: 0,
    horas_max_semana: 40,
    crear_usuario: true
  });

  const resetForm = () => {
    setFormData({
      codigo_ibm: '',
      dni: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      empleo: '',
      modalidad: 'NOMBRADO',
      categoria: 'PRINCIPAL',
      dedicacion: 'TIEMPO_COMPLETO_40H',
      antiguedad: 0,
      horas_max_semana: 40,
      crear_usuario: true
    });

    setDocenteSeleccionado(null);
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['docentes', buscar],
    queryFn: () => docentesService.listar({ buscar }).then(res => res.data)
  });

  const docentes = Array.isArray(response) ? response : response?.data || [];

  const mutationCrear = useMutation({
    mutationFn: (datos: any) => docentesService.crear(datos),
    onSuccess: (response: any) => {
      const password = response.data?.passwordTemporal;

      setToast({
        mensaje: password
          ? `Docente creado. Contraseña temporal: ${password}`
          : 'Docente creado correctamente',
        tipo: 'exito'
      });

      setModalAbierto(false);
      resetForm();

      queryClient.invalidateQueries({
        queryKey: ['docentes']
      });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al crear docente', tipo: 'error' });
    }
  });

  const mutationEditar = useMutation({
    mutationFn: (datos: any) => docentesService.actualizar(docenteSeleccionado.id, datos),
    onSuccess: () => {
      setToast({ mensaje: 'Docente actualizado correctamente', tipo: 'exito' });
      setModalAbierto(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al actualizar docente', tipo: 'error' });
    }
  });

  const mutationEliminar = useMutation({
    mutationFn: (id: number) => docentesService.eliminar(id),
    onSuccess: () => {
      setToast({ mensaje: 'Docente desactivado correctamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al desactivar docente', tipo: 'error' });
    }
  });

  const abrirEditar = (docente: any) => {
    setDocenteSeleccionado(docente);

    setFormData({
      codigo_ibm: docente.codigo_ibm || '',
      dni: docente.dni || '',
      nombres: docente.nombres || '',
      apellidos: docente.apellidos || '',
      email: docente.email || '',
      telefono: docente.telefono || '',
      empleo: docente.empleo || '',
      modalidad: docente.modalidad || 'NOMBRADO',
      categoria: docente.categoria || 'PRINCIPAL',
      dedicacion: docente.dedicacion || 'TIEMPO_COMPLETO_40H',
      antiguedad: docente.antiguedad || 0,
      horas_max_semana: docente.horas_max_semana || 40,
      crear_usuario: false
    });

    setModalAbierto(true);
  };

  const manejarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (docenteSeleccionado) {
      mutationEditar.mutate(formData);
    } else {
      mutationCrear.mutate(formData);
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
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{item.modalidad}</span>
        </div>
      )
    },
    { 
      clave: 'categoria', 
      titulo: 'Categoría',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-tight">
            {item.categoria}
          </span>
        </div>
      )
    },
    { 
      clave: 'horas_max_semana', 
      titulo: 'Carga Máx.',
      render: (item: any) => (
        <span className="font-mono font-bold text-unt-primary bg-unt-primary/5 px-2 py-1 rounded text-xs">
          {item.horas_max_semana}H / SEM
        </span>
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
    <div className="space-y-8 max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <Users className="w-3.5 h-3.5" />
              Gestión de Personal
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Gestión de Docentes</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Registro de plana docente y configuración de límites de carga lectiva por periodo académico.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Acciones y Búsqueda */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="relative flex-1 w-full lg:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar docente por nombre, apellido o correo..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-unt-primary/5 focus:border-unt-primary transition-all bg-white shadow-sm"
          />
        </div>
        <Boton onClick={() => { resetForm(); setModalAbierto(true); }} className="rounded-2xl px-8 py-4 shadow-lg shadow-unt-primary/20">
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo Docente
        </Boton>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={docentes}
            loading={isLoading}
            alEditar={abrirEditar}
            alEliminar={(docente) => {
              if (confirm(`¿Está seguro de desactivar al docente "${docente.nombres} ${docente.apellidos}"?`)) {
                mutationEliminar.mutate(docente.id);
              }
            }}
          />
        </CardContent>
      </Card>

      {modalAbierto && (
        <Modal 
          isOpen={true} 
          cerrar={() => setModalAbierto(false)}
          titulo={docenteSeleccionado ? 'Editar Docente' : 'Registrar Nuevo Docente'}
        >
          <form onSubmit={manejarSubmit} className="space-y-6">

            {/* DATOS PERSONALES */}
            <div className="grid grid-cols-2 gap-4">

              <CampoTexto
                label="Código IBM"
                value={formData.codigo_ibm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    codigo_ibm: e.target.value
                  })
                }
              />

              <CampoTexto
                label="DNI"
                value={formData.dni}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dni: e.target.value
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <CampoTexto
                label="Nombres"
                required
                value={formData.nombres}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nombres: e.target.value
                  })
                }
              />

              <CampoTexto
                label="Apellidos"
                required
                value={formData.apellidos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    apellidos: e.target.value
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <CampoTexto
                label="Email Institucional"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                }
              />

              <CampoTexto
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefono: e.target.value
                  })
                }
              />
            </div>

            <CampoTexto
              label="Empleo / Cargo"
              value={formData.empleo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  empleo: e.target.value
                })
              }
            />

            {/* CONFIGURACIÓN DOCENTE */}
            <div className="grid grid-cols-2 gap-4">

              <Selector
                label="Modalidad"
                value={formData.modalidad}
                onChange={(e: any) =>
                  setFormData({
                    ...formData,
                    modalidad: e.target.value
                  })
                }
                opciones={[
                  { valor: 'NOMBRADO', etiqueta: 'Nombrado' },
                  { valor: 'CONTRATADO', etiqueta: 'Contratado' },
                ]}
              />

              <Selector
                label="Categoría"
                value={formData.categoria}
                onChange={(e: any) =>
                  setFormData({
                    ...formData,
                    categoria: e.target.value
                  })
                }
                opciones={[
                  { valor: 'PRINCIPAL', etiqueta: 'Principal' },
                  { valor: 'ASOCIADO', etiqueta: 'Asociado' },
                  { valor: 'AUXILIAR', etiqueta: 'Auxiliar' },
                  { valor: 'JEFE_PRACTICA', etiqueta: 'Jefe de Práctica' },
                ]}
              />
            </div>

            <Selector
              label="Dedicación"
              value={formData.dedicacion}
              onChange={(e: any) =>
                setFormData({
                  ...formData,
                  dedicacion: e.target.value
                })
              }
              opciones={[
                {
                  valor: 'TIEMPO_COMPLETO_40H',
                  etiqueta: 'Tiempo Completo 40H'
                },
                {
                  valor: 'DEDICACION_EXCLUSIVA_40H',
                  etiqueta: 'Dedicación Exclusiva 40H'
                },
                {
                  valor: 'TIEMPO_PARCIAL_20H',
                  etiqueta: 'Tiempo Parcial 20H'
                },
                {
                  valor: 'TIEMPO_PARCIAL_16H',
                  etiqueta: 'Tiempo Parcial 16H'
                },
                {
                  valor: 'TIEMPO_PARCIAL_12H',
                  etiqueta: 'Tiempo Parcial 12H'
                },
                {
                  valor: 'TIEMPO_PARCIAL_10H',
                  etiqueta: 'Tiempo Parcial 10H'
                },
                {
                  valor: 'TIEMPO_PARCIAL_8H',
                  etiqueta: 'Tiempo Parcial 8H'
                }
              ]}
            />

            {/* HORAS */}
            <div className="grid grid-cols-2 gap-4">

              <CampoTexto
                label="Límite Horas/Semana"
                type="number"
                value={formData.horas_max_semana}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    horas_max_semana: Number(e.target.value)
                  })
                }
              />

              <CampoTexto
                label="Antigüedad (Años)"
                type="number"
                value={formData.antiguedad}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    antiguedad: Number(e.target.value)
                  })
                }
              />
            </div>

            {/* USUARIO */}
            {!docenteSeleccionado && (
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="crear_usuario"
                  checked={formData.crear_usuario}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      crear_usuario: e.target.checked
                    })
                  }
                  className="w-4 h-4 text-unt-primary border-slate-300 rounded focus:ring-unt-primary"
                />

                <label
                  htmlFor="crear_usuario"
                  className="text-sm font-medium text-slate-600 cursor-pointer"
                >
                  Crear cuenta de acceso automáticamente
                  <span className="block text-xs text-slate-400">
                    Se generará una contraseña temporal automáticamente
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">

              <Boton
                variante="secundario"
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-xl"
              >
                Cancelar
              </Boton>

              <Boton
                type="submit"
                disabled={mutationCrear.isPending || mutationEditar.isPending}
                className="rounded-xl px-8"
              >
                {mutationCrear.isPending || mutationEditar.isPending
                  ? 'Guardando...'
                  : docenteSeleccionado
                    ? 'Actualizar'
                    : 'Guardar Docente'}
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
