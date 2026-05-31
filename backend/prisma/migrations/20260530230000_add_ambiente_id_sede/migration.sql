-- Agrega columna id_sede a la tabla ambiente y la constraint FK a sede
ALTER TABLE "ambiente"
  ADD COLUMN IF NOT EXISTS "id_sede" INTEGER;

-- Crear la relación con sede si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'ambiente' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id_sede'
  ) THEN
    ALTER TABLE "ambiente"
      ADD CONSTRAINT "ambiente_id_sede_fkey"
      FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
