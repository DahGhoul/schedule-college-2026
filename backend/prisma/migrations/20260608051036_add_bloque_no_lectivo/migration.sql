-- CreateTable
CREATE TABLE "bloque_no_lectivo" (
    "id_bloque_no_lectivo" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "seccion" "SeccionNoLectiva" NOT NULL,
    "dia_semana" VARCHAR(15) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    "fecha_modificacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloque_no_lectivo_pkey" PRIMARY KEY ("id_bloque_no_lectivo")
);

-- CreateIndex
CREATE INDEX "bloque_no_lectivo_id_docente_id_periodo_dia_semana_idx" ON "bloque_no_lectivo"("id_docente", "id_periodo", "dia_semana");

-- AddForeignKey
ALTER TABLE "bloque_no_lectivo" ADD CONSTRAINT "bloque_no_lectivo_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_no_lectivo" ADD CONSTRAINT "bloque_no_lectivo_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;
