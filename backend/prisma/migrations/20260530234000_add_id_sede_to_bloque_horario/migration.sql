-- Añade la columna id_sede a bloque_horario y FK a sede
ALTER TABLE "bloque_horario"
  ADD COLUMN IF NOT EXISTS "id_sede" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'bloque_horario' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id_sede'
  ) THEN
    ALTER TABLE "bloque_horario"
      ADD CONSTRAINT "bloque_horario_id_sede_fkey"
      FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
