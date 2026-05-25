'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { cursosService } from '@/services/cursos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Plus, Trash2, Save, Clock } from 'lucide-react';

export default function OfertaAcademicaPage() {
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [idCurso, setIdCurso] = useState<number>(0);
  const [idCiclo, setIdCiclo] = useState<number>(0);
  const [tipoCurso, setTipoCurso] = useState<'REGULAR' | 'ELECTIVO'>('REGULAR');
  const [componentes, setComponentes] = useState<any[]>([]);
  
  const [mensaje, setMensaje] = useState<{
    texto: string;
    tipo: 'exito' | 'error' | 'advertencia';
  } | null>(null);

  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data)
  });

  const { data: cursos } = useQuery({
    queryKey: ['cursos'],
    queryFn: () => cursosService.listar().then(res => res.data)
  });

  const { data: periodoDetalle } = useQuery({
    queryKey: ['periodo', idPeriodo],
    queryFn: () => periodosService.obtener(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });

  const mutation = useMutation({
    mutationFn: (datos: any) => cargaHorariaService.configurarOferta(datos),
    onSuccess: () => {
      setMensaje({ texto: 'Oferta académica configurada correctamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['curso', idCurso] });
    },
    onError: (error: any) => {
      setMensaje({ texto: error.response?.data?.error || 'Error al configurar oferta', tipo: 'error' });
    }
  });

  const agregarComponente = () => {
    // Si no hay teoría, agregamos teoría por defecto, si no, laboratorio
    const tieneTeoria = componentes.some(c => c.tipo === 'TEORIA');
    const nuevoTipo = tieneTeoria ? 'LABORATORIO' : 'TEORIA';
    setComponentes([...componentes, { tipo: nuevoTipo, horas_requeridas: 2, n_grupos: 1 }]);
  };

  const eliminarComponente = (index: number) => {
    setComponentes(componentes.filter((_, i) => i !== index));
  };

  const actualizarComponente = (index: number, campo: string, valor: any) => {
    const nuevos = [...componentes];
    nuevos[index][campo] = valor;
    setComponentes(nuevos);
  };

  const guardarOferta = () => {
    if (!idPeriodo || !idCurso || !idCiclo) {
      setMensaje({ texto: 'Debe completar todos los campos obligatorios', tipo: 'error' });
      return;
    }
    
    // Validar que no haya horas en 0
    if (componentes.some(c => c.horas_requeridas <= 0 || c.n_grupos <= 0)) {
      setMensaje({ texto: 'Las horas y grupos deben ser mayores a 0', tipo: 'error' });
      return;
    }

    mutation.mutate({
      id_periodo: idPeriodo,
      id_curso: idCurso,
      id_ciclo: idCiclo,
      tipo_curso: tipoCurso,
      componentes: componentes.map(c => ({
        ...c,
        horas_requeridas: Number(c.horas_requeridas),
        n_grupos: Number(c.n_grupos)
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Oferta Académica</h1>
          <p className="text-gray-500 text-sm">Configura los cursos que se dictarán en el periodo y sus componentes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Datos de la Oferta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Selector
              label="Período Académico"
              value={idPeriodo}
              onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
            >
              <option value={0}>Seleccione un periodo</option>
              {periodos?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Selector>

            <Selector
              label="Ciclo"
              value={idCiclo}
              onChange={(e: any) => setIdCiclo(Number(e.target.value))}
              disabled={!idPeriodo}
            >
              <option value={0}>Seleccione un ciclo</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>Ciclo {n}</option>
              ))}
            </Selector>

            <Selector
              label="Curso"
              value={idCurso}
              onChange={(e: any) => setIdCurso(Number(e.target.value))}
            >
              <option value={0}>Seleccione un curso</option>
              {cursos?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
              ))}
            </Selector>

            <Selector
              label="Tipo de Curso"
              value={tipoCurso}
              onChange={(e: any) => setTipoCurso(e.target.value)}
            >
              <option value="REGULAR">Regular</option>
              <option value="ELECTIVO">Electivo</option>
            </Selector>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Componentes y Grupos</CardTitle>
            <Boton
              onClick={agregarComponente}
              variante="borde"
              className="px-3 py-1.5 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Componente
            </Boton>
          </CardHeader>
          <CardContent className="space-y-4">
            {componentes.map((comp, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative">
                <button
                  onClick={() => eliminarComponente(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Selector
                    label="Tipo de Componente"
                    value={comp.tipo}
                    onChange={(e: any) => actualizarComponente(index, 'tipo', e.target.value)}
                    opciones={[
                      { valor: 'TEORIA', etiqueta: 'Teoría-Práctica' },
                      { valor: 'LABORATORIO', etiqueta: 'Laboratorio' },
                    ]}
                  />
                  <CampoTexto
                    label={comp.tipo === 'LABORATORIO' ? "Horas/Semana (por grupo)" : "Horas/Semana"}
                    type="number"
                    value={comp.horas_requeridas}
                    onChange={(e: any) => actualizarComponente(index, 'horas_requeridas', Number(e.target.value))}
                  />
                  <CampoTexto
                    label="Nº Grupos"
                    type="number"
                    value={comp.n_grupos}
                    onChange={(e: any) => actualizarComponente(index, 'n_grupos', Number(e.target.value))}
                    disabled={comp.tipo === 'TEORIA'} // Teoría suele ser único
                  />
                </div>
                {comp.tipo === 'LABORATORIO' && (
                  <p className="text-[11px] font-bold text-unt-primary mt-2 flex items-center gap-1 bg-unt-primary/5 p-2 rounded-lg">
                    <Clock className="w-4 h-4" />
                    RESUMEN: {comp.horas_requeridas}h por grupo × {comp.n_grupos} grupos = {comp.horas_requeridas * comp.n_grupos} horas totales de carga.
                  </p>
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Boton onClick={guardarOferta} disabled={mutation.isPending}>
                <Save className="h-4 w-4 mr-2" /> {mutation.isPending ? 'Guardando...' : 'Guardar Oferta'}
              </Boton>
            </div>
          </CardContent>
        </Card>
      </div>

      {mensaje && (
        <NotificacionToast
          mensaje={mensaje.texto}
          tipo={mensaje.tipo}
          onClose={() => setMensaje(null)}
        />
      )}
    </div>
  );
}
