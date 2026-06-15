-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('I', 'II', 'III');

-- AlterTable
ALTER TABLE "periodo_academico" ADD COLUMN     "tipo" "TipoPeriodo" NOT NULL DEFAULT 'I',
ALTER COLUMN "activo" SET DEFAULT false;
