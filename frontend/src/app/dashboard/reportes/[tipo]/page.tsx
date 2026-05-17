'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '@/services/reportes.service';
import { periodosService } from '@/services/periodos.service';
import { docentesService } from '@/services/docentes.service';
import { ambientesService } from '@/services/ambientes.service';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { VisorPDF } from '@/components/reportes/VisorPDF';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function GenerarReportePage() {
  const params = useParams();
  const tipo = params.tipo as string;

  const [parametros, setParametros] = useState<Record<string, any>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  const { data: periodoActivo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });

  const { data: docentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar().then((res) => res.data),
    enabled: tipo === 'docente',
  });

  const { data: ambientes } = useQuery({
    queryKey: ['ambientes'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
    enabled: tipo === 'aula' || tipo === 'laboratorio',
  });

  const manejarGenerar = async () => {
    setError('');
    setGenerando(true);
    try {
      const datos = {
        tipo,
        idPeriodo: periodoActivo?.id,
        ...parametros,
      };
      const res = await reportesService.generar(datos);
      setJobId(res.data.jobId);
      // Consultar estado periódicamente (se podría mejorar con polling)
      const interval = setInterval(async () => {
        const estadoRes = await reportesService.estado(res.data.jobId);
        if (estadoRes.data.estado === 'completed') {
          clearInterval(interval);
          setGenerando(false);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al generar reporte');
      setGenerando(false);
    }
  };

  const descargar = () => {
    if (jobId) {
      reportesService.descargar(jobId).then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${tipo}.pdf`;
        a.click();
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Generar Reporte: {tipo}</h1>

      <div className="space-y-4 mb-6">
        {tipo === 'docente' && (
          <Selector
            label="Docente"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar docente' },
              ...(docentes?.map((d: any) => ({
                valor: String(d.id),
                etiqueta: `${d.nombres} ${d.apellidos}`,
              })) || []),
            ]}
            value={parametros.idDocente?.toString() || ''}
            onChange={(e) =>
              setParametros({ ...parametros, idDocente: parseInt(e.target.value) })
            }
          />
        )}
        {(tipo === 'aula' || tipo === 'laboratorio') && (
          <Selector
            label="Ambiente"
            opciones={[
              { valor: '', etiqueta: 'Seleccionar ambiente' },
              ...(ambientes
                ?.filter((a: any) =>
                  tipo === 'aula' ? a.tipo === 'AULA' : a.tipo === 'LABORATORIO'
                )
                .map((a: any) => ({
                  valor: String(a.id),
                  etiqueta: `${a.codigo} (${a.tipo})`,
                })) || []),
            ]}
            value={parametros.idAula?.toString() || ''}
            onChange={(e) =>
              setParametros({ ...parametros, idAula: parseInt(e.target.value) })
            }
          />
        )}
        <Boton onClick={manejarGenerar} disabled={generando}>
          {generando ? 'Generando...' : 'Generar Reporte'}
        </Boton>
        {error && <NotificacionToast mensaje={error} tipo="error" />}
      </div>

      {jobId && !generando && (
        <VisorPDF jobId={jobId} onDescargar={descargar} />
      )}
    </div>
  );
}