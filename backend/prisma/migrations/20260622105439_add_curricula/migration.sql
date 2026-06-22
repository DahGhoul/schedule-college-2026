-- CreateTable
CREATE TABLE "curricula" (
    "id_curricula" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id_curricula")
);

-- CreateIndex
CREATE UNIQUE INDEX "curricula_codigo_key" ON "curricula"("codigo");

-- AlterTable
ALTER TABLE "curso" ADD COLUMN "id_curricula" INTEGER;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_curricula_fkey" FOREIGN KEY ("id_curricula") REFERENCES "curricula"("id_curricula") ON DELETE SET NULL ON UPDATE CASCADE;
