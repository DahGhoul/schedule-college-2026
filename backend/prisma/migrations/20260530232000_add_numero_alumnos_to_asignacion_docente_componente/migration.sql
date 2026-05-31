-- Añade la columna numero_alumnos a asignacion_docente_componente
ALTER TABLE "asignacion_docente_componente"
  ADD COLUMN IF NOT EXISTS "numero_alumnos" INTEGER;
