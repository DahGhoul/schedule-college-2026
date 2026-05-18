ALTER TABLE "curso"
ADD COLUMN IF NOT EXISTS "horas_practica" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "disponibilidad_ambiente" (
  "id_disponibilidad_ambiente" SERIAL NOT NULL,
  "id_ambiente" INTEGER NOT NULL,
  "dia_semana" VARCHAR(15) NOT NULL,
  "hora_inicio" VARCHAR(5) NOT NULL,
  "hora_fin" VARCHAR(5) NOT NULL,
  "disponible" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "disponibilidad_ambiente_pkey" PRIMARY KEY ("id_disponibilidad_ambiente")
);

CREATE UNIQUE INDEX IF NOT EXISTS "disponibilidad_ambiente_id_ambiente_dia_semana_hora_inicio_key"
ON "disponibilidad_ambiente" ("id_ambiente", "dia_semana", "hora_inicio");

ALTER TABLE "disponibilidad_ambiente"
ADD CONSTRAINT "disponibilidad_ambiente_id_ambiente_fkey"
FOREIGN KEY ("id_ambiente") REFERENCES "ambiente"("id_ambiente") ON DELETE CASCADE ON UPDATE CASCADE;
