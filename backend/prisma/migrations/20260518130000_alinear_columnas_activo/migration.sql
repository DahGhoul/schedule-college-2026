-- Alinea el esquema actual con las columnas booleanas de actividad usadas por Prisma
ALTER TABLE "periodo_academico"
ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "curso"
ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "grupo"
ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;
