'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { CalendarioGeneral } from '@/components/horarios/CalendarioGeneral';
import { periodosService } from '@/services/periodos.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Calendar, Filter } from 'lucide-react';

export default function VistaHorarioCicloPage() {
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);

  // Obtener periodo activo
  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data),
  });

  const periodoActivo = periodos?.find((p: any) => p.activo);

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
                placeholder="Seleccione un ciclo"
                opciones={ciclos}
                value={cicloSeleccionado?.toString() || ''}
                onChange={(e) => setCicloSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            {periodoActivo && (
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-unt-primary/10 text-unt-primary rounded-xl text-sm font-bold">
                <Calendar className="w-4 h-4" />
                Periodo: {periodoActivo.nombre}
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
