'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { periodosService } from '@/services/periodos.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Calendar, Filter, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { reportesService, descargarBlob } from '@/services/reportes.service';

export default function VistaHorarioCicloPage() {
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportandoTodo, setExportandoTodo] = useState(false);

  // Obtener periodo activo
  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data),
  });

  const periodoActivo = periodos?.find((p: any) => p.activo);

  const exportarExcel = async () => {
    if (!cicloSeleccionado || !periodoActivo) return;
    try {
      setExportando(true);
      const res = await reportesService.excelCiclo(cicloSeleccionado, periodoActivo.id);
      descargarBlob(res.data, `horario-ciclo-${cicloSeleccionado}-${periodoActivo.nombre}.xlsx`);
    } catch (error) {
      console.error('Error exportando excel:', error);
    } finally {
      setExportando(false);
    }
  };

  const exportarTodo = async () => {
    if (!periodoActivo) return;
    try {
      setExportandoTodo(true);
      const res = await reportesService.excelTodosLosCiclos(periodoActivo.id);
      descargarBlob(res.data, `horarios-todos-los-ciclos-${periodoActivo.nombre}.xlsx`);
    } catch (error) {
      console.error('Error exportando todo:', error);
    } finally {
      setExportandoTodo(false);
    }
  };

  // Ciclos del 1 al 10
  const ciclos = Array.from({ length: 10 }, (_, i) => ({
    valor: String(i + 1),
    etiqueta: `Ciclo ${i + 1}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-unt-primary" />
            Horarios por Ciclo
          </h1>
          <p className="text-slate-500 mt-1">
            Visualiza la programación horaria consolidada por ciclo académico.
          </p>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Filtrar por:</span>
            </div>

            <div className="w-64">
              <Selector
                label="Ciclo Académico"
                
                opciones={ciclos}
                value={cicloSeleccionado?.toString() || ''}
                onChange={(e) => setCicloSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            {periodoActivo && (
              <div className="ml-auto flex items-center gap-4">
                <Boton
                  onClick={exportarTodo}
                  disabled={exportandoTodo}
                  className="rounded-xl flex items-center gap-2"
                  variante="borde"
                >
                  {exportandoTodo ? (
                    <SpinnerCarga />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Exportar Todos los Ciclos
                </Boton>

                <Boton
                  onClick={exportarExcel}
                  disabled={!cicloSeleccionado || exportando}
                  className="rounded-xl flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  variante="borde"
                >
                  {exportando ? (
                    <SpinnerCarga className="w-4 h-4" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  Exportar Excel
                </Boton>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-unt-primary/10 text-unt-primary rounded-xl text-sm font-bold border border-unt-primary/20">
                  <Calendar className="w-4 h-4" />
                  Periodo: {periodoActivo.nombre}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!cicloSeleccionado ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <Calendar className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Seleccione un ciclo académico para visualizar su horario.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 overflow-hidden">
          {periodoActivo ? (
            <CalendarioGeneral 
              idPeriodo={periodoActivo.id} 
              filtroTipo="CICLO" 
              filtroId={cicloSeleccionado} 
              modo="LECTURA" 
            />
          ) : (
            <div className="p-10 text-center text-amber-600 bg-amber-50">
              No hay un periodo académico activo seleccionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
