'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { cargaNoLectivaService } from '@/services/carga-no-lectiva.service';
import { Formato1 } from '@/components/formatos/Formato1';
import { Formato2 } from '@/components/formatos/Formato2';
import { Formato3 } from '@/components/formatos/Formato3';

export default function ImprimirFormatoPage({ params }: { params: { tipo: string } }) {
  const searchParams = useSearchParams();
  const idPeriodo = Number(searchParams.get('idPeriodo'));
  const tipoFormato = decodeURIComponent(params.tipo);
  
  const { data: declaracionData, isLoading: loadingDeclaracion } = useQuery({
    queryKey: ['mi-carga-no-lectiva', 'impresion', idPeriodo],
    queryFn: () => cargaNoLectivaService.obtenerMiDeclaracion(idPeriodo).then(res => res.data),
    enabled: !!idPeriodo,
  });

  const { data: horarioData, isLoading: loadingHorario } = useQuery({
    queryKey: ['horario-docente-combinado', 'impresion', idPeriodo],
    queryFn: () => cargaNoLectivaService.obtenerMiHorarioNoLectivo(idPeriodo).then(res => res.data),
    enabled: !!idPeriodo && tipoFormato === 'HORARIO_SEMANAL_DOCENTE',
  });

  const isLoading = tipoFormato === 'HORARIO_SEMANAL_DOCENTE' 
    ? loadingDeclaracion || loadingHorario 
    : loadingDeclaracion;

  useEffect(() => {
    if (declaracionData && !isLoading) {
      // Damos un pequeño retraso para asegurar que las fuentes y estilos hayan cargado
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [declaracionData, isLoading]);

  if (isLoading || !declaracionData) {
    return <div className="p-10 text-center font-sans">Cargando formato para impresión...</div>;
  }

  const isFormato1 = tipoFormato === 'CARGA_HORARIA_CENTRAL' || tipoFormato === 'CARGA_HORARIA_DESCONCENTRADA';
  const isFormato2 = tipoFormato === 'DECLARACION_JURADA_CENTRAL' || tipoFormato === 'DECLARACION_JURADA_DESCONCENTRADA';
  const isFormato3 = tipoFormato === 'HORARIO_SEMANAL_DOCENTE';
  const isSedeCentral = tipoFormato.includes('CENTRAL');

  // Prepare data for Formato3
  const formato3Data = isFormato3 ? {
    ...declaracionData,
    horario: horarioData
  } : declaracionData;

  return (
    <div className="bg-white text-black">
      {isFormato1 ? (
        <Formato1 data={declaracionData} isSedeCentral={isSedeCentral} />
      ) : isFormato2 ? (
        <Formato2 data={declaracionData} isSedeCentral={isSedeCentral} />
      ) : (
        <Formato3 data={formato3Data} isSedeCentral={isSedeCentral} />
      )}
    </div>
  );
}
