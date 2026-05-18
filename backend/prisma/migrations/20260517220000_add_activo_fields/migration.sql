-- Add activo column to curso table
ALTER TABLE "curso" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- Add activo column to grupo table
ALTER TABLE "grupo" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- Add activo column to periodo_academico table
ALTER TABLE "periodo_academico" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
