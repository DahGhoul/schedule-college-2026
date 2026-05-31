-- Añade la columna es_sede_desconcentrada a bloque_horario
ALTER TABLE "bloque_horario"
  ADD COLUMN IF NOT EXISTS "es_sede_desconcentrada" BOOLEAN NOT NULL DEFAULT false;
