-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "hash_contrasena" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso" TIMESTAMP,
    "id_docente" INTEGER,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_id_docente_key" ON "usuario"("id_docente");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE SET NULL ON UPDATE CASCADE;
