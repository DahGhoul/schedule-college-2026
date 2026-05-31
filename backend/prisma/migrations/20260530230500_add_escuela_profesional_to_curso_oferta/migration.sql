-- Añade la columna escuela_profesional a curso_oferta
ALTER TABLE "curso_oferta"
  ADD COLUMN IF NOT EXISTS "escuela_profesional" VARCHAR(150);
