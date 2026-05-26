'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { cursosService } from '@/services/cursos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { SelectorFiltrable } from '@/components/ui/SelectorFiltrable';
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

  // Pre-seleccionar periodo activo
  useEffect(() => {
    if (periodos && idPeriodo === 0) {
      const activo = periodos.find((p: any) => p.activo);
      if (activo) setIdPeriodo(activo.id);
    }
  }, [periodos, idPeriodo]);

  const { data: cursos } = useQuery({
    queryKey: ['cursos'],
    queryFn: () => cursosService.listar().then(res => res.data)
  });

  const { data: periodoDetalle } = useQuery({
    queryKey: ['periodo', idPeriodo],
    queryFn: () => periodosService.obtener(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });

  const { data: ciclosConOferta } = useQuery({
    queryKey: ['ciclos-con-oferta', idPeriodo],
    queryFn: () => cargaHorariaService.obtenerCiclosPorPeriodo(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });

  const { data: ofertaExistente, isLoading: isLoadingOferta } = useQuery({
    queryKey: ['oferta-detalle', idPeriodo, idCurso, idCiclo],
    queryFn: () => cargaHorariaService.obtenerOfertaDetalle(idPeriodo, idCurso, idCiclo).then(res => res.data),
    enabled: idPeriodo > 0 && idCurso > 0 && idCiclo > 0
  });

  // Usar useEffect para reaccionar a ofertaExistente
  useEffect(() => {
    if (isLoadingOferta) return;

    if (ofertaExistente) {
      setTipoCurso(ofertaExistente.tipo_curso);
      const comps = ofertaExistente.componentes.map((c: any) => ({
        tipo: c.tipo,
        horas_requeridas: c.horas_requeridas / (c.grupos?.length || 1),
        n_grupos: c.grupos?.length || 1
      }));
      setComponentes(comps);
    } else if (idCurso > 0 && idPeriodo > 0 && idCiclo > 0) {
      // Si no existe pero hay curso seleccionado, empezar con uno por defecto
      setComponentes([{ tipo: 'TEORIA', horas_requeridas: 2, n_grupos: 1 }]);
    } else {
      setComponentes([]);
    }
  }, [ofertaExistente, idCurso, idPeriodo, idCiclo, isLoadingOferta]);

  const mutation = useMutation({
    mutationFn: (datos: any) => cargaHorariaService.configurarOferta(datos),
    onSuccess: () => {
      setMensaje({ texto: 'Oferta académica configurada correctamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['oferta-detalle', idPeriodo, idCurso, idCiclo] });
      queryClient.invalidateQueries({ queryKey: ['curso', idCurso] });
    },
    onError: (error: any) => {
      setMensaje({ texto: error.response?.data?.error || 'Error al configurar oferta', tipo: 'error' });
    }
  });

  const agregarComponente = () => {
    // Si no hay teoría, agregamos teoría por defecto, si no, laboratorio
    const tieneTeoria = componentes.some(c => c.tipo === 'TEORIA');
    const tieneLab = componentes.some(c => c.tipo === 'LABORATORIO');

    if (tieneTeoria && tieneLab) {
      setMensaje({ texto: 'Este curso ya tiene todos los componentes permitidos (Teoría-Práctica y Laboratorio)', tipo: 'advertencia' });
      return;
    }

    const nuevoTipo = tieneTeoria ? 'LABORATORIO' : 'TEORIA';
    setComponentes([...componentes, { tipo: nuevoTipo, horas_requeridas: 2, n_grupos: 1 }]);
  };

  const eliminarComponente = (index: number) => {
    setComponentes(componentes.filter((_, i) => i !== index));
  };

  const actualizarComponente = (index: number, campo: string, valor: any) => {
    if (campo === 'tipo') {
      const yaExiste = componentes.some((c, i) => i !== index && c.tipo === valor);
      if (yaExiste) {
        setMensaje({ texto: `El componente de ${valor === 'TEORIA' ? 'Teoría-Práctica' : 'Laboratorio'} ya está agregado.`, tipo: 'advertencia' });
        return;
      }
    }
    const nuevos = [...componentes];
    nuevos[index][campo] = valor;
    setComponentes(nuevos);
  };

  const guardarOferta = () => {
    if (!idPeriodo || !idCurso || !idCiclo) {
      setMensaje({ texto: 'Debe completar todos los campos obligatorios', tipo: 'error' });
      return;
    }

    // Validar duplicados de tipos (Teoría/Laboratorio)
    const tipos = componentes.map(c => c.tipo);
    if (new Set(tipos).size !== tipos.length) {
      setMensaje({ texto: 'No se pueden guardar componentes duplicados para el mismo curso.', tipo: 'error' });
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
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle>Datos de la Oferta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[450px]">
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
              {/* Solo mostrar ciclos 1-10 por defecto, pero podrías usar ciclosConOferta si quieres filtrar aquí también */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>Ciclo {n}</option>
              ))}
            </Selector>

            <SelectorFiltrable
              label="Curso"
              value={idCurso}
              onChange={(valor) => setIdCurso(Number(valor))}
              opciones={cursos?.map((c: any) => ({
                valor: c.id,
                etiqueta: `${c.codigo} - ${c.nombre}`
              })) || []}
              placeholder="Buscar curso por código o nombre..."
            />

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
                    label={comp.tipo === 'LABORATORIO' ? "Horas/Semana (por grupo)" : "Horas/Semana (Teoría-Práctica)"}
                    type="number"
                    value={comp.horas_requeridas}
                    onChange={(e: any) => actualizarComponente(index, 'horas_requeridas', Number(e.target.value))}
                  />
                  <CampoTexto
                    label="Nº Grupos"
                    type="number"
                    value={comp.n_grupos}
                    onChange={(e: any) => actualizarComponente(index, 'n_grupos', Number(e.target.value))}
                    disabled={comp.tipo === 'TEORIA'} // Teoría-Práctica suele ser único
                  />
                </div>
                <p className="text-[11px] font-bold text-unt-primary mt-2 flex items-center gap-1 bg-unt-primary/5 p-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  RESUMEN: {comp.horas_requeridas}h por grupo × {comp.n_grupos} {comp.n_grupos === 1 ? 'grupo' : 'grupos'} = {comp.horas_requeridas * comp.n_grupos} horas totales de carga.
                </p>
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
