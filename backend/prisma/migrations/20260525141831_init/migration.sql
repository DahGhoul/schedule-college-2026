-- AlterTable
ALTER TABLE "asignacion_docente_componente" ALTER COLUMN "horas_asignadas" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "curso_componente" ALTER COLUMN "horas_requeridas" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "docente" ALTER COLUMN "horas_max_semana" SET DATA TYPE DOUBLE PRECISION;
