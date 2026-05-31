-- Añade la columna id_registrado_por a asignacion_docente_componente y FK a usuario
ALTER TABLE "asignacion_docente_componente"
  ADD COLUMN IF NOT EXISTS "id_registrado_por" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'asignacion_docente_componente' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id_registrado_por'
  ) THEN
    ALTER TABLE "asignacion_docente_componente"
      ADD CONSTRAINT "asignacion_docente_componente_id_registrado_por_fkey"
      FOREIGN KEY ("id_registrado_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
