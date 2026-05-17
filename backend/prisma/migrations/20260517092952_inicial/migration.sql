-- CreateTable
CREATE TABLE "periodo_academico" (
    "id_periodo" SERIAL NOT NULL,
    "nombre" VARCHAR(20) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',

    CONSTRAINT "periodo_academico_pkey" PRIMARY KEY ("id_periodo")
);

-- CreateTable
CREATE TABLE "docente" (
    "id_docente" SERIAL NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20),
    "modalidad" VARCHAR(20) NOT NULL,
    "categoria" VARCHAR(30) NOT NULL,
    "antiguedad" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "docente_pkey" PRIMARY KEY ("id_docente")
);

-- CreateTable
CREATE TABLE "curso" (
    "id_curso" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "horas_teoria" INTEGER NOT NULL DEFAULT 0,
    "horas_laboratorio" INTEGER NOT NULL DEFAULT 0,
    "creditos" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id_curso")
);

-- CreateTable
CREATE TABLE "docente_curso" (
    "id_docente_curso" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,

    CONSTRAINT "docente_curso_pkey" PRIMARY KEY ("id_docente_curso")
);

-- CreateTable
CREATE TABLE "ambiente" (
    "id_ambiente" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 40,
    "piso" INTEGER,
    "equipamiento" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ambiente_pkey" PRIMARY KEY ("id_ambiente")
);

-- CreateTable
CREATE TABLE "curso_ambiente" (
    "id_curso_ambiente" SERIAL NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_ambiente" INTEGER NOT NULL,
    "tipo_clase" VARCHAR(20) NOT NULL,

    CONSTRAINT "curso_ambiente_pkey" PRIMARY KEY ("id_curso_ambiente")
);

-- CreateTable
CREATE TABLE "grupo" (
    "id_grupo" SERIAL NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "codigo_grupo" VARCHAR(5) NOT NULL,
    "capacidad_maxima" INTEGER NOT NULL DEFAULT 40,

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id_grupo")
);

-- CreateTable
CREATE TABLE "disponibilidad_docente" (
    "id_disponibilidad" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "dia_semana" VARCHAR(15) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "disponibilidad_docente_pkey" PRIMARY KEY ("id_disponibilidad")
);

-- CreateTable
CREATE TABLE "ventana_atencion" (
    "id_ventana" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "categoria" VARCHAR(30) NOT NULL,
    "modalidad" VARCHAR(20) NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "ventana_atencion_pkey" PRIMARY KEY ("id_ventana")
);

-- CreateTable
CREATE TABLE "atencion_docente" (
    "id_atencion" SERIAL NOT NULL,
    "id_ventana" INTEGER NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "orden_espera" INTEGER NOT NULL,

    CONSTRAINT "atencion_docente_pkey" PRIMARY KEY ("id_atencion")
);

-- CreateTable
CREATE TABLE "horario_asignado" (
    "id_horario" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_grupo" INTEGER,
    "id_ambiente" INTEGER NOT NULL,
    "tipo_clase" VARCHAR(20) NOT NULL,
    "dia_semana" VARCHAR(15) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    "id_ventana" INTEGER,
    "comentario" TEXT,
    "fecha_modificacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horario_asignado_pkey" PRIMARY KEY ("id_horario")
);

-- CreateTable
CREATE TABLE "auditoria_horario" (
    "id_auditoria" SERIAL NOT NULL,
    "id_horario" INTEGER,
    "tipo_accion" VARCHAR(30) NOT NULL,
    "usuario" VARCHAR(100) NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalle" TEXT NOT NULL,
    "datos_anteriores" JSONB,

    CONSTRAINT "auditoria_horario_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id_configuracion" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "clave" VARCHAR(50) NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'TEXTO',

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "dia_no_laborable" (
    "id_dia_no_laborable" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'FERIADO',

    CONSTRAINT "dia_no_laborable_pkey" PRIMARY KEY ("id_dia_no_laborable")
);

-- CreateTable
CREATE TABLE "mantenimiento" (
    "id_mantenimiento" SERIAL NOT NULL,
    "id_ambiente" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP NOT NULL,
    "fecha_fin" TIMESTAMP NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "mantenimiento_pkey" PRIMARY KEY ("id_mantenimiento")
);

-- CreateTable
CREATE TABLE "preferencia_notificacion" (
    "id_preferencia" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "correo_habilitado" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "telegram_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_verificado" BOOLEAN NOT NULL DEFAULT false,
    "telegram_id" VARCHAR(50),

    CONSTRAINT "preferencia_notificacion_pkey" PRIMARY KEY ("id_preferencia")
);

-- CreateTable
CREATE TABLE "historial_notificacion" (
    "id_historial" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "tipo_mensaje" VARCHAR(50) NOT NULL,
    "estado_envio" VARCHAR(20) NOT NULL,
    "fecha_envio" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contenido" TEXT,
    "reintentos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "historial_notificacion_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "cola_notificacion" (
    "id_cola" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "tipo_mensaje" VARCHAR(50) NOT NULL,
    "contenido" TEXT NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado_en" TIMESTAMP(3),

    CONSTRAINT "cola_notificacion_pkey" PRIMARY KEY ("id_cola")
);

-- CreateTable
CREATE TABLE "seleccion_temporal" (
    "id_seleccion" TEXT NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "id_ambiente" INTEGER NOT NULL,
    "dia_semana" VARCHAR(15) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "expiracion" TIMESTAMP NOT NULL,
    "sesion_id" VARCHAR(100) NOT NULL,

    CONSTRAINT "seleccion_temporal_pkey" PRIMARY KEY ("id_seleccion")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodo_academico_nombre_key" ON "periodo_academico"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "docente_email_key" ON "docente"("email");

-- CreateIndex
CREATE INDEX "docente_modalidad_categoria_antiguedad_idx" ON "docente"("modalidad", "categoria", "antiguedad");

-- CreateIndex
CREATE UNIQUE INDEX "curso_codigo_key" ON "curso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "docente_curso_id_docente_id_curso_key" ON "docente_curso"("id_docente", "id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "ambiente_codigo_key" ON "ambiente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "curso_ambiente_id_curso_id_ambiente_tipo_clase_key" ON "curso_ambiente"("id_curso", "id_ambiente", "tipo_clase");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_id_curso_codigo_grupo_key" ON "grupo"("id_curso", "codigo_grupo");

-- CreateIndex
CREATE UNIQUE INDEX "atencion_docente_id_ventana_id_docente_key" ON "atencion_docente"("id_ventana", "id_docente");

-- CreateIndex
CREATE INDEX "horario_asignado_id_periodo_id_docente_idx" ON "horario_asignado"("id_periodo", "id_docente");

-- CreateIndex
CREATE INDEX "horario_asignado_id_periodo_id_ambiente_dia_semana_hora_ini_idx" ON "horario_asignado"("id_periodo", "id_ambiente", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE INDEX "horario_asignado_id_periodo_id_grupo_dia_semana_hora_inicio_idx" ON "horario_asignado"("id_periodo", "id_grupo", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_id_periodo_clave_key" ON "configuracion"("id_periodo", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_notificacion_id_docente_key" ON "preferencia_notificacion"("id_docente");

-- CreateIndex
CREATE INDEX "historial_notificacion_id_docente_fecha_envio_idx" ON "historial_notificacion"("id_docente", "fecha_envio");

-- CreateIndex
CREATE INDEX "cola_notificacion_estado_creado_en_idx" ON "cola_notificacion"("estado", "creado_en");

-- CreateIndex
CREATE INDEX "seleccion_temporal_expiracion_idx" ON "seleccion_temporal"("expiracion");

-- AddForeignKey
ALTER TABLE "docente_curso" ADD CONSTRAINT "docente_curso_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_curso" ADD CONSTRAINT "docente_curso_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_ambiente" ADD CONSTRAINT "curso_ambiente_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_ambiente" ADD CONSTRAINT "curso_ambiente_id_ambiente_fkey" FOREIGN KEY ("id_ambiente") REFERENCES "ambiente"("id_ambiente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "disponibilidad_docente_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventana_atencion" ADD CONSTRAINT "ventana_atencion_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atencion_docente" ADD CONSTRAINT "atencion_docente_id_ventana_fkey" FOREIGN KEY ("id_ventana") REFERENCES "ventana_atencion"("id_ventana") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atencion_docente" ADD CONSTRAINT "atencion_docente_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_asignado" ADD CONSTRAINT "horario_asignado_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_asignado" ADD CONSTRAINT "horario_asignado_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_asignado" ADD CONSTRAINT "horario_asignado_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_asignado" ADD CONSTRAINT "horario_asignado_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "grupo"("id_grupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_asignado" ADD CONSTRAINT "horario_asignado_id_ambiente_fkey" FOREIGN KEY ("id_ambiente") REFERENCES "ambiente"("id_ambiente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimiento" ADD CONSTRAINT "mantenimiento_id_ambiente_fkey" FOREIGN KEY ("id_ambiente") REFERENCES "ambiente"("id_ambiente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_notificacion" ADD CONSTRAINT "preferencia_notificacion_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE CASCADE ON UPDATE CASCADE;
