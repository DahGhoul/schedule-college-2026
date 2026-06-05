/*
  Warnings:

  - You are about to drop the `horario_personal_docente` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[dni]` on the table `docente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "horario_personal_docente" DROP CONSTRAINT "horario_personal_docente_id_declaracion_fkey";

-- DropForeignKey
ALTER TABLE "horario_personal_docente" DROP CONSTRAINT "horario_personal_docente_id_docente_fkey";

-- DropForeignKey
ALTER TABLE "horario_personal_docente" DROP CONSTRAINT "horario_personal_docente_id_periodo_fkey";

-- AlterTable
ALTER TABLE "ambiente" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "docente" ADD COLUMN     "dni" VARCHAR(20),
ADD COLUMN     "empleo" VARCHAR(150);

-- DropTable
DROP TABLE "horario_personal_docente";

-- CreateTable
CREATE TABLE "datos_institucionales" (
    "id" SERIAL NOT NULL,
    "universidad" VARCHAR(200) NOT NULL,
    "siglas_universidad" VARCHAR(20) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "escuela" VARCHAR(200) NOT NULL,
    "departamento_academico" VARCHAR(200) NOT NULL,
    "ciudad" VARCHAR(100) NOT NULL,
    "logo_url" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datos_institucionales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "docente_dni_key" ON "docente"("dni");
