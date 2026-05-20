/*
  Warnings:

  - You are about to drop the column `id_horario` on the `auditoria_horario` table. All the data in the column will be lost.
  - You are about to drop the column `horas_laboratorio` on the `curso` table. All the data in the column will be lost.
  - You are about to drop the column `horas_practica` on the `curso` table. All the data in the column will be lost.
  - You are about to drop the column `horas_teoria` on the `curso` table. All the data in the column will be lost.
  - You are about to drop the column `codigo_grupo` on the `grupo` table. All the data in the column will be lost.
  - You are about to drop the column `id_curso` on the `grupo` table. All the data in the column will be lost.
  - You are about to drop the `curso_ambiente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `curso_ciclo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `docente_curso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `horario_asignado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seleccion_temporal` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id_componente,codigo]` on the table `grupo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `grupo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_componente` to the `grupo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('REGULAR', 'ELECTIVO');

-- CreateEnum
CREATE TYPE "TipoComponente" AS ENUM ('TEORIA', 'PRACTICA', 'LABORATORIO');

-- DropForeignKey
ALTER TABLE "curso_ambiente" DROP CONSTRAINT "curso_ambiente_id_ambiente_fkey";

-- DropForeignKey
ALTER TABLE "curso_ambiente" DROP CONSTRAINT "curso_ambiente_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "curso_ciclo" DROP CONSTRAINT "curso_ciclo_id_ciclo_fkey";

-- DropForeignKey
ALTER TABLE "curso_ciclo" DROP CONSTRAINT "curso_ciclo_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "docente_curso" DROP CONSTRAINT "docente_curso_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "docente_curso" DROP CONSTRAINT "docente_curso_id_docente_fkey";

-- DropForeignKey
ALTER TABLE "grupo" DROP CONSTRAINT "grupo_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "horario_asignado" DROP CONSTRAINT "horario_asignado_id_ambiente_fkey";

-- DropForeignKey
ALTER TABLE "horario_asignado" DROP CONSTRAINT "horario_asignado_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "horario_asignado" DROP CONSTRAINT "horario_asignado_id_docente_fkey";

-- DropForeignKey
ALTER TABLE "horario_asignado" DROP CONSTRAINT "horario_asignado_id_grupo_fkey";

-- DropForeignKey
ALTER TABLE "horario_asignado" DROP CONSTRAINT "horario_asignado_id_periodo_fkey";

-- DropIndex
DROP INDEX "disponibilidad_ambiente_id_ambiente_dia_semana_hora_inicio_key";

-- DropIndex
DROP INDEX "docente_modalidad_categoria_antiguedad_idx";

-- DropIndex
DROP INDEX "grupo_id_curso_codigo_grupo_key";

-- AlterTable
ALTER TABLE "auditoria_horario" DROP COLUMN "id_horario",
ADD COLUMN     "id_bloque_horario" INTEGER;

-- AlterTable
ALTER TABLE "curso" DROP COLUMN "horas_laboratorio",
DROP COLUMN "horas_practica",
DROP COLUMN "horas_teoria";

-- AlterTable
ALTER TABLE "grupo" DROP COLUMN "codigo_grupo",
DROP COLUMN "id_curso",
ADD COLUMN     "codigo" VARCHAR(10) NOT NULL,
ADD COLUMN     "id_componente" INTEGER NOT NULL;

-- DropTable
DROP TABLE "curso_ambiente";

-- DropTable
DROP TABLE "curso_ciclo";

-- DropTable
DROP TABLE "docente_curso";

-- DropTable
DROP TABLE "horario_asignado";

-- DropTable
DROP TABLE "seleccion_temporal";

-- CreateTable
CREATE TABLE "curso_oferta" (
    "id_curso_oferta" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "tipo_curso" "TipoCurso" NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',

    CONSTRAINT "curso_oferta_pkey" PRIMARY KEY ("id_curso_oferta")
);

-- CreateTable
CREATE TABLE "curso_componente" (
    "id_componente" SERIAL NOT NULL,
    "id_oferta" INTEGER NOT NULL,
    "tipo" "TipoComponente" NOT NULL,
    "horas_requeridas" INTEGER NOT NULL,
    "permite_multi_docente" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "curso_componente_pkey" PRIMARY KEY ("id_componente")
);

-- CreateTable
CREATE TABLE "asignacion_docente_componente" (
    "id_asignacion_docente" SERIAL NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "horas_asignadas" INTEGER NOT NULL,

    CONSTRAINT "asignacion_docente_componente_pkey" PRIMARY KEY ("id_asignacion_docente")
);

-- CreateTable
CREATE TABLE "bloque_horario" (
    "id_bloque_horario" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "id_ambiente" INTEGER,
    "id_grupo" INTEGER NOT NULL,
    "dia_semana" VARCHAR(15) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "comentario" TEXT,
    "pendiente_ambiente" BOOLEAN NOT NULL DEFAULT false,
    "fecha_modificacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloque_horario_pkey" PRIMARY KEY ("id_bloque_horario")
);

-- CreateIndex
CREATE UNIQUE INDEX "curso_oferta_id_periodo_id_curso_id_ciclo_key" ON "curso_oferta"("id_periodo", "id_curso", "id_ciclo");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_docente_componente_id_componente_id_docente_key" ON "asignacion_docente_componente"("id_componente", "id_docente");

-- CreateIndex
CREATE INDEX "bloque_horario_id_periodo_id_docente_dia_semana_idx" ON "bloque_horario"("id_periodo", "id_docente", "dia_semana");

-- CreateIndex
CREATE INDEX "bloque_horario_id_periodo_id_ambiente_dia_semana_idx" ON "bloque_horario"("id_periodo", "id_ambiente", "dia_semana");

-- CreateIndex
CREATE INDEX "bloque_horario_id_periodo_id_grupo_dia_semana_idx" ON "bloque_horario"("id_periodo", "id_grupo", "dia_semana");

-- CreateIndex
CREATE INDEX "bloque_horario_id_periodo_id_componente_idx" ON "bloque_horario"("id_periodo", "id_componente");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_id_componente_codigo_key" ON "grupo"("id_componente", "codigo");

-- AddForeignKey
ALTER TABLE "curso_oferta" ADD CONSTRAINT "curso_oferta_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_oferta" ADD CONSTRAINT "curso_oferta_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_oferta" ADD CONSTRAINT "curso_oferta_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclo"("id_ciclo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_componente" ADD CONSTRAINT "curso_componente_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "curso_oferta"("id_curso_oferta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_docente_componente" ADD CONSTRAINT "asignacion_docente_componente_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "curso_componente"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_docente_componente" ADD CONSTRAINT "asignacion_docente_componente_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "curso_componente"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_horario" ADD CONSTRAINT "bloque_horario_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_horario" ADD CONSTRAINT "bloque_horario_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "curso_componente"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_horario" ADD CONSTRAINT "bloque_horario_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_horario" ADD CONSTRAINT "bloque_horario_id_ambiente_fkey" FOREIGN KEY ("id_ambiente") REFERENCES "ambiente"("id_ambiente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_horario" ADD CONSTRAINT "bloque_horario_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "grupo"("id_grupo") ON DELETE RESTRICT ON UPDATE CASCADE;
