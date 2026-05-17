'use client';
import { Boton } from '@/components/ui/Boton';

interface VisorPDFProps {
  jobId: string;
  onDescargar: () => void;
}

export function VisorPDF({ jobId, onDescargar }: VisorPDFProps) {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/reportes/descargar/${jobId}`;

  return (
    <div className="space-y-4">
      <p className="text-green-600 font-semibold">Reporte generado correctamente</p>
      <iframe src={url} className="w-full h-[600px] border rounded" title="Reporte PDF" />
      <Boton onClick={onDescargar}>Descargar PDF</Boton>
    </div>
  );
}