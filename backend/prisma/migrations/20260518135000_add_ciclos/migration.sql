-- CreateTable ciclo
CREATE TABLE IF NOT EXISTS "ciclo" (
  "id_ciclo" SERIAL NOT NULL,
  "numero" SMALLINT NOT NULL,
  "nombre" VARCHAR(50),
  "id_periodo" INTEGER NOT NULL,
  CONSTRAINT "ciclo_pkey" PRIMARY KEY ("id_ciclo")
);

-- Unique constraint per periodo + numero
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ciclo_id_periodo_numero_key') THEN
    ALTER TABLE "ciclo" ADD CONSTRAINT "ciclo_id_periodo_numero_key" UNIQUE ("id_periodo", "numero");
  END IF;
END$$;

-- Foreign key to periodo_academico (conditionally create constraint)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ciclo_id_periodo_fkey') THEN
    ALTER TABLE "ciclo" ADD CONSTRAINT "ciclo_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- CreateTable curso_ciclo
CREATE TABLE IF NOT EXISTS "curso_ciclo" (
  "id_curso_ciclo" SERIAL NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "id_ciclo" INTEGER NOT NULL,
  CONSTRAINT "curso_ciclo_pkey" PRIMARY KEY ("id_curso_ciclo")
);

-- Unique index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'curso_ciclo_id_curso_id_ciclo_key') THEN
    CREATE UNIQUE INDEX "curso_ciclo_id_curso_id_ciclo_key" ON "curso_ciclo" ("id_curso", "id_ciclo");
  END IF;
END$$;

-- Foreign keys (conditionally create constraints)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curso_ciclo_id_curso_fkey') THEN
    ALTER TABLE "curso_ciclo" ADD CONSTRAINT "curso_ciclo_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curso_ciclo_id_ciclo_fkey') THEN
    ALTER TABLE "curso_ciclo" ADD CONSTRAINT "curso_ciclo_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclo"("id_ciclo") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
