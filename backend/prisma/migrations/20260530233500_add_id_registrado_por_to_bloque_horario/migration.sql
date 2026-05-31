-- Añade la columna id_registrado_por a bloque_horario y FK a usuario
ALTER TABLE "bloque_horario"
  ADD COLUMN IF NOT EXISTS "id_registrado_por" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'bloque_horario' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id_registrado_por'
  ) THEN
    ALTER TABLE "bloque_horario"
      ADD CONSTRAINT "bloque_horario_id_registrado_por_fkey"
      FOREIGN KEY ("id_registrado_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
