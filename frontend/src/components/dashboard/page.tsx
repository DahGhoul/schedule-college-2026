'use client';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { useResumen, useAvanceCategoria, useOcupacionAmbientes, useMapaCalor, useCargaDocente } from '@/hooks/useEstadisticas';
import { useActividadTiempoReal } from '@/hooks/useActividadTiempoReal';
import { PanelKPIs } from '@/components/dashboard/PanelKPIs';
import { GraficoAvanceCategoria } from '@/components/dashboard/GraficoAvanceCategoria';
import { GraficoOcupacionAmbientes } from '@/components/dashboard/GraficoOcupacionAmbientes';
import { MapaCalorOcupacion } from '@/components/dashboard/MapaCalorOcupacion';
import { ActividadTiempoReal } from '@/components/dashboard/ActividadTiempoReal';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function DashboardPage() {
  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const idPeriodo = periodoActivo?.id || 0;

  const { data: resumen, isLoading: resumenLoading } = useResumen(idPeriodo);
  const { data: avanceCategoria } = useAvanceCategoria(idPeriodo);
  const { data: ocupacion } = useOcupacionAmbientes(idPeriodo);
  const { data: mapaCalor } = useMapaCalor(idPeriodo);
  const { data: cargaDocente } = useCargaDocente(idPeriodo);
  const eventos = useActividadTiempoReal();

  if (periodoLoading || resumenLoading) return <SpinnerCarga />;

  const kpis = resumen
    ? [
        { etiqueta: 'Docentes', valor: resumen.totalDocentes },
        { etiqueta: 'Cursos', valor: resumen.totalCursos },
        { etiqueta: 'Ambientes', valor: resumen.totalAmbientes },
        { etiqueta: 'Horarios Asignados', valor: `${resumen.horariosAsignados} (${resumen.porcentajeAsignado}%)` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-500">Período activo: {periodoActivo?.nombre || 'Ninguno'}</p>

      <PanelKPIs kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {avanceCategoria && <GraficoAvanceCategoria datos={avanceCategoria} />}
        {ocupacion && <GraficoOcupacionAmbientes datos={ocupacion} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {mapaCalor && (
            <MapaCalorOcupacion
              dias={mapaCalor.dias}
              horas={mapaCalor.horas}
              conteo={mapaCalor.conteo}
            />
          )}
        </div>
        <div>
          <ActividadTiempoReal eventos={eventos} />
        </div>
      </div>
    </div>
  );
}