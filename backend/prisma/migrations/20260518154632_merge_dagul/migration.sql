-- DropForeignKey
ALTER TABLE "ciclo" DROP CONSTRAINT "ciclo_id_periodo_fkey";

-- AddForeignKey
ALTER TABLE "ciclo" ADD CONSTRAINT "ciclo_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;
