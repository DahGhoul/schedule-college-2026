/*
  Warnings:

  - You are about to alter the column `horas_asignadas` on the `asignacion_docente_componente` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `horas_requeridas` on the `curso_componente` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `horas_max_semana` on the `docente` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "asignacion_docente_componente" ALTER COLUMN "horas_asignadas" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "curso_componente" ALTER COLUMN "horas_requeridas" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "docente" ALTER COLUMN "horas_max_semana" SET DATA TYPE INTEGER;
