'use client';
import { Selector } from '@/components/ui/Selector';

interface CursoAsignable {
  idCurso: number;
  nombreCurso: string;
  tipoClase: string;
  horasRequeridas: number;
  horasAsignadas: number;
}

interface PanelSeleccionCursoProps {
  cursos: CursoAsignable[];
  cursoSeleccionado: number | null;
  tipoSeleccionado: string;
  alCambiarCurso: (idCurso: number, tipo: string) => void;
}

export function PanelSeleccionCurso({
  cursos,
  cursoSeleccionado,
  tipoSeleccionado,
  alCambiarCurso,
}: PanelSeleccionCursoProps) {
  const cursosUnicos = Array.from(new Map(cursos.map((c) => [c.idCurso, c])).values());

  return (
    <div className="flex gap-4 p-4 bg-white rounded shadow">
      <Selector
        label="Curso"
        opciones={[
          { valor: '', etiqueta: 'Seleccionar curso' },
          ...cursosUnicos.map((c) => ({ valor: String(c.idCurso), etiqueta: c.nombreCurso })),
        ]}
        value={cursoSeleccionado?.toString() || ''}
        onChange={(e) => alCambiarCurso(parseInt(e.target.value), tipoSeleccionado)}
      />
      <Selector
        label="Tipo"
        opciones={[
          { valor: 'TEORIA', etiqueta: 'Teoría' },
          { valor: 'LABORATORIO', etiqueta: 'Laboratorio' },
        ]}
        value={tipoSeleccionado}
        onChange={(e) =>
          alCambiarCurso(cursoSeleccionado || 0, e.target.value)
        }
      />
    </div>
  );
}