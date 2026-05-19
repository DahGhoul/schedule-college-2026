'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { Boton } from '@/components/ui/Boton';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FileDown, Send, Printer } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ReportesSecretariaPage() {
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCiclo, setIdCiclo] = useState<number>(1);

  const { data: periodos, isLoading: periodosLoading } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then((res: any) => res.data),
  });

  const descargarExcel = async () => {
    if (!idPeriodo) return;
    try {
      const response = await apiClient.get('/reportes/descargar-excel', {
        params: { idPeriodo, idCiclo },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `horario-ciclo-${idCiclo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al descargar excel', error);
    }
  };

  if (periodosLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Generación y Publicación de Horarios</h1>
        <p className="text-gray-500 text-sm">Genera los entregables oficiales en Excel y notifica a los docentes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Reporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Selector
              label="Período Académico"
              value={idPeriodo?.toString() || ''}
              onChange={(e: any) => setIdPeriodo(parseInt(e.target.value))}
            >
              <option value="">Seleccionar período</option>
              {periodos?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Selector>

            <Selector
              label="Ciclo Académico"
              value={idCiclo.toString()}
              onChange={(e: any) => setIdCiclo(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>Ciclo {n}</option>
              ))}
            </Selector>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <Boton onClick={descargarExcel} disabled={!idPeriodo} variante="borde" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" /> Descargar Excel (Formato Oficial)
            </Boton>
            
            <Boton variante="borde" className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Generar PDF Individuales
            </Boton>

            <Boton disabled={!idPeriodo} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4" /> Publicar y Notificar a Docentes
            </Boton>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 text-sm mb-1">Entregable Excel</h3>
          <p className="text-xs text-blue-600">Incluye datos institucionales, detalle de carga por docente y el horario visual con códigos de colores e índices.</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <h3 className="font-bold text-green-800 text-sm mb-1">Notificación Automática</h3>
          <p className="text-xs text-green-600">Envía un correo electrónico a cada docente con su horario adjunto una vez que la programación sea publicada.</p>
        </div>
      </div>
    </div>
  );
}
