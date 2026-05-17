'use client';
import { SelectorTipoReporte } from '@/components/reportes/SelectorTipoReporte';

export default function ReportesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Centro de Reportes</h1>
      <SelectorTipoReporte />
    </div>
  );
}