'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ambientesService } from '@/services/ambientes.service';
import { horariosService } from '@/services/horarios.service';
import { periodosService } from '@/services/periodos.service';
import { reportesService, descargarBlob } from '@/services/reportes.service';
import { Selector } from '@/components/ui/Selector';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Boton } from '@/components/ui/Boton';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  School, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  Share2, 
  Filter 
} from 'lucide-react';

export default function VistaHorarioAulaPage() {
  const [ambienteSeleccionado, setAmbienteSeleccionado] = useState<number | null>(null);
  const [descargando, setDescargando] = useState<'excel' | 'pdf' | 'excel-todo' | 'pdf-todo' | null>(null);

  // Obtener período activo
  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo-aula'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  // Obtener lista de ambientes activos
  const { data: ambientes } = useQuery({
    queryKey: ['ambientes-activos-vista'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const exportarArchivo = async (tipo: 'excel' | 'pdf', todo: boolean = false) => {
    if (!periodoActivo) return;
    if (!todo && !ambienteSeleccionado) return;

    const key = todo ? `${tipo}-todo` : tipo;
    try {
      setDescargando(key as any);
      let res;
      let nombre;

      if (todo) {
        res = tipo === 'excel' 
          ? await reportesService.excelTodosLosAmbientes(periodoActivo.id)
          : await reportesService.pdfTodosLosAmbientes(periodoActivo.id);
        nombre = `horarios-todos-los-ambientes-${periodoActivo.nombre}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`;
      } else {
        const amb = (ambientes || []).find((a: any) => a.id === ambienteSeleccionado);
        res = tipo === 'excel'
          ? await reportesService.excelAmbiente(ambienteSeleccionado!, periodoActivo.id)
          : await reportesService.pdfAmbiente(ambienteSeleccionado!, periodoActivo.id);
        nombre = `horario-ambiente-${amb?.codigo || ambienteSeleccionado}-${periodoActivo.nombre}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`;
      }

      descargarBlob(res.data, nombre);
    } catch (error) {
      console.error(`Error exportando ${tipo}:`, error);
    } finally {
      setDescargando(null);
    }
  };

  if (periodoLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <School className="w-3.5 h-3.5" />
              Infraestructura Educativa
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Horario por Aula / Laboratorio</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Visualiza la ocupación de ambientes en tiempo real y descarga reportes de programación física.
            </p>
          </div>
          
          {periodoActivo && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl p-4 rounded-[2rem] border border-white/20 shadow-inner">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Periodo Activo</p>
                <p className="text-xl font-black text-white leading-none">{periodoActivo.nombre}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Filtrado y Exportación */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-4 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-visible group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                <Filter className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Filtrar Ambiente</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Aulas y Laboratorios</p>
              </div>
            </div>

            <div className="space-y-4">
              <Selector
                label=""
                opciones={[
                  { valor: '', etiqueta: '-- Seleccionar Ambiente --' },
                  ...(ambientes
                    ?.filter((a: any) => a.activo)
                    .map((a: any) => ({
                      valor: String(a.id),
                      etiqueta: `${a.codigo} (${a.tipo === 'AULA' ? 'Aula' : 'Laboratorio'}, Cap: ${a.capacidad})`,
                    })) || []),
                ]}
                value={ambienteSeleccionado?.toString() || ''}
                onChange={(e) => setAmbienteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full py-4 text-lg font-bold rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-4 focus:ring-unt-primary/5 transition-all"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8 h-full flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Exportar Reportes</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Formatos Excel y PDF</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ambiente Seleccionado</p>
                <div className="flex gap-3">
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all"
                    onClick={() => exportarArchivo('excel')} 
                    disabled={!ambienteSeleccionado || !!descargando}
                  >
                    {descargando === 'excel' ? <SpinnerCarga /> : <FileSpreadsheet className="w-5 h-5 mr-2" />}
                    Excel
                  </Boton>
                  <Boton 
                    className="flex-1 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white"
                    onClick={() => exportarArchivo('pdf')} 
                    disabled={!ambienteSeleccionado || !!descargando}
                  >
                    {descargando === 'pdf' ? <SpinnerCarga /> : <FileText className="w-5 h-5 mr-2" />}
                    PDF
                  </Boton>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reporte General de Aulas</p>
                <div className="flex gap-3">
                  <Boton 
                    variante="borde"
                    className="flex-1 py-4 rounded-2xl border-slate-200 text-slate-700 font-bold hover:border-unt-primary transition-all"
                    onClick={() => exportarArchivo('excel', true)} 
                    disabled={!!descargando}
                  >
                    {descargando === 'excel-todo' ? <SpinnerCarga /> : <Share2 className="w-5 h-5 mr-2" />}
                    Todos (XLS)
                  </Boton>
                  <Boton 
                    variante="borde"
                    className="flex-1 py-4 rounded-2xl border-rose-100 text-rose-700 font-bold hover:bg-rose-50 transition-all"
                    onClick={() => exportarArchivo('pdf', true)} 
                    disabled={!!descargando}
                  >
                    {descargando === 'pdf-todo' ? <SpinnerCarga /> : <FileDown className="w-5 h-5 mr-2" />}
                    Todos (PDF)
                  </Boton>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendario / Horario */}
      {!ambienteSeleccionado ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in duration-1000">
          <div className="p-8 bg-slate-100/50 rounded-full mb-6 ring-8 ring-slate-50">
            <School className="w-16 h-12 text-slate-300" />
          </div>
          <h4 className="text-xl font-bold text-slate-800">Panel en Espera</h4>
          <p className="text-slate-400 font-medium mt-2">Seleccione un ambiente académico para cargar el cronograma visual.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-hidden animate-in zoom-in-95 duration-500">
          {periodoActivo ? (
            <CalendarioGeneral 
              idPeriodo={periodoActivo.id} 
              filtroTipo="AULA" 
              filtroId={ambienteSeleccionado} 
              modo="LECTURA" 
            />
          ) : (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="p-4 bg-amber-50 rounded-full text-amber-500">
                <Share2 className="w-8 h-8" />
              </div>
              <p className="text-amber-700 font-bold text-lg">No hay un periodo académico activo para mostrar horarios.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}