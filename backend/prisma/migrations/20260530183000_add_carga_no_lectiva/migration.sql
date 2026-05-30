-- Create enum types required by the new no-lective declaration module
CREATE TYPE "TipoSede" AS ENUM ('CENTRAL', 'DESCONCENTRADA');
CREATE TYPE "DedicacionDocente" AS ENUM (
  'TIEMPO_COMPLETO_40H',
  'DEDICACION_EXCLUSIVA_40H',
  'TIEMPO_PARCIAL_20H',
  'TIEMPO_PARCIAL_16H',
  'TIEMPO_PARCIAL_12H',
  'TIEMPO_PARCIAL_10H'
);
CREATE TYPE "SeccionNoLectiva" AS ENUM (
  'PREPARACION_EVALUACION',
  'CONSEJERIA_TUTORIA',
  'INVESTIGACION',
  'CAPACITACION',
  'ACTIVIDADES_GOBIERNO',
  'ACTIVIDADES_ADMINISTRACION',
  'ASESORIA_TESIS',
  'RESPONSABILIDAD_SOCIAL',
  'COMITES_COMISIONES'
);
CREATE TYPE "EstadoDeclaracion" AS ENUM ('BORRADOR', 'COMPLETADO', 'VALIDADO', 'PUBLICADO');
CREATE TYPE "TipoFormato" AS ENUM (
  'CARGA_HORARIA_CENTRAL',
  'DECLARACION_JURADA_CENTRAL',
  'CARGA_HORARIA_DESCONCENTRADA',
  'DECLARACION_JURADA_DESCONCENTRADA',
  'HORARIO_SEMANAL_DOCENTE'
);

-- New base table required by the updated schema
CREATE TABLE IF NOT EXISTS "sede" (
  "id_sede" SERIAL NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "codigo" VARCHAR(20) NOT NULL,
  "tipo" "TipoSede" NOT NULL DEFAULT 'CENTRAL',
  "distrito" VARCHAR(100),
  "provincia" VARCHAR(100),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "sede_pkey" PRIMARY KEY ("id_sede")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sede_codigo_key" ON "sede"("codigo");

-- Required modifications in existing tables
ALTER TABLE "periodo_academico"
  ADD COLUMN IF NOT EXISTS "id_sede" INTEGER;

ALTER TABLE "docente"
  ADD COLUMN IF NOT EXISTS "codigo_ibm" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "dedicacion" "DedicacionDocente" NOT NULL DEFAULT 'TIEMPO_COMPLETO_40H',
  ADD COLUMN IF NOT EXISTS "id_sede_principal" INTEGER;

-- Backfill IBM codes for existing rows before enforcing uniqueness
UPDATE "docente"
SET "codigo_ibm" = COALESCE(NULLIF("codigo_ibm", ''), 'IBM-' || "id_docente")
WHERE "codigo_ibm" IS NULL OR "codigo_ibm" = '';

ALTER TABLE "docente"
  ALTER COLUMN "codigo_ibm" SET NOT NULL;

ALTER TABLE "docente"
  ADD CONSTRAINT "docente_codigo_ibm_key" UNIQUE ("codigo_ibm");

ALTER TABLE "periodo_academico"
  ADD CONSTRAINT "periodo_academico_id_sede_fkey"
  FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "docente"
  ADD CONSTRAINT "docente_id_sede_principal_fkey"
  FOREIGN KEY ("id_sede_principal") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

-- New declaration tables
CREATE TABLE IF NOT EXISTS "declaracion_carga" (
  "id_declaracion" SERIAL NOT NULL,
  "id_docente" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "total_horas_lectivas" INTEGER NOT NULL DEFAULT 0,
  "total_horas_no_lectivas" INTEGER NOT NULL DEFAULT 0,
  "total_horas" INTEGER NOT NULL DEFAULT 0,
  "estado" "EstadoDeclaracion" NOT NULL DEFAULT 'BORRADOR',
  "fecha_declaracion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_validacion" TIMESTAMP(3),
  "validado_por" VARCHAR(100),
  "observaciones" TEXT,
  CONSTRAINT "declaracion_carga_pkey" PRIMARY KEY ("id_declaracion")
);

CREATE UNIQUE INDEX IF NOT EXISTS "declaracion_carga_id_docente_id_periodo_key"
  ON "declaracion_carga"("id_docente", "id_periodo");

ALTER TABLE "declaracion_carga"
  ADD CONSTRAINT "declaracion_carga_id_docente_fkey"
  FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "declaracion_carga"
  ADD CONSTRAINT "declaracion_carga_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "carga_no_lectiva" (
  "id_carga_no_lectiva" SERIAL NOT NULL,
  "id_declaracion" INTEGER NOT NULL,
  "id_docente" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "seccion" "SeccionNoLectiva" NOT NULL,
  "descripcion" TEXT,
  "horas_declaradas" INTEGER NOT NULL DEFAULT 0,
  "codigo_resolucion" VARCHAR(50),
  "valido" BOOLEAN NOT NULL DEFAULT true,
  "observacion" TEXT,
  "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_modificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carga_no_lectiva_pkey" PRIMARY KEY ("id_carga_no_lectiva")
);

CREATE UNIQUE INDEX IF NOT EXISTS "carga_no_lectiva_id_declaracion_seccion_key"
  ON "carga_no_lectiva"("id_declaracion", "seccion");

CREATE INDEX IF NOT EXISTS "carga_no_lectiva_id_docente_id_periodo_idx"
  ON "carga_no_lectiva"("id_docente", "id_periodo");

ALTER TABLE "carga_no_lectiva"
  ADD CONSTRAINT "carga_no_lectiva_id_declaracion_fkey"
  FOREIGN KEY ("id_declaracion") REFERENCES "declaracion_carga"("id_declaracion") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carga_no_lectiva"
  ADD CONSTRAINT "carga_no_lectiva_id_docente_fkey"
  FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "carga_no_lectiva"
  ADD CONSTRAINT "carga_no_lectiva_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "horario_personal_docente" (
  "id_horario_personal" SERIAL NOT NULL,
  "id_docente" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_declaracion" INTEGER NOT NULL,
  "seccion_no_lectiva" "SeccionNoLectiva" NOT NULL,
  "dia_semana" VARCHAR(15) NOT NULL,
  "hora_inicio" VARCHAR(5) NOT NULL,
  "hora_fin" VARCHAR(5) NOT NULL,
  "descripcion" TEXT,
  "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horario_personal_docente_pkey" PRIMARY KEY ("id_horario_personal")
);

CREATE INDEX IF NOT EXISTS "horario_personal_docente_id_docente_dia_semana_idx"
  ON "horario_personal_docente"("id_docente", "dia_semana");

ALTER TABLE "horario_personal_docente"
  ADD CONSTRAINT "horario_personal_docente_id_docente_fkey"
  FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horario_personal_docente"
  ADD CONSTRAINT "horario_personal_docente_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horario_personal_docente"
  ADD CONSTRAINT "horario_personal_docente_id_declaracion_fkey"
  FOREIGN KEY ("id_declaracion") REFERENCES "declaracion_carga"("id_declaracion") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "asignacion_sede" (
  "id_asignacion_sede" SERIAL NOT NULL,
  "id_docente" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_sede" INTEGER NOT NULL,
  "numero_comision_servicios" VARCHAR(50),
  "fecha_inicio" DATE,
  "fecha_fin" DATE,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "asignacion_sede_pkey" PRIMARY KEY ("id_asignacion_sede")
);

CREATE UNIQUE INDEX IF NOT EXISTS "asignacion_sede_id_docente_id_periodo_id_sede_key"
  ON "asignacion_sede"("id_docente", "id_periodo", "id_sede");

ALTER TABLE "asignacion_sede"
  ADD CONSTRAINT "asignacion_sede_id_docente_fkey"
  FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asignacion_sede"
  ADD CONSTRAINT "asignacion_sede_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asignacion_sede"
  ADD CONSTRAINT "asignacion_sede_id_sede_fkey"
  FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "formato_generado" (
  "id_formato" SERIAL NOT NULL,
  "id_docente" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_declaracion" INTEGER,
  "tipo_formato" "TipoFormato" NOT NULL,
  "ruta_archivo" VARCHAR(500),
  "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id_generado_por" INTEGER,
  CONSTRAINT "formato_generado_pkey" PRIMARY KEY ("id_formato")
);

CREATE UNIQUE INDEX IF NOT EXISTS "formato_generado_id_docente_id_periodo_tipo_formato_key"
  ON "formato_generado"("id_docente", "id_periodo", "tipo_formato");

CREATE INDEX IF NOT EXISTS "formato_generado_id_docente_id_periodo_idx"
  ON "formato_generado"("id_docente", "id_periodo");

ALTER TABLE "formato_generado"
  ADD CONSTRAINT "formato_generado_id_docente_fkey"
  FOREIGN KEY ("id_docente") REFERENCES "docente"("id_docente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "formato_generado"
  ADD CONSTRAINT "formato_generado_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "periodo_academico"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "formato_generado"
  ADD CONSTRAINT "formato_generado_id_declaracion_fkey"
  FOREIGN KEY ("id_declaracion") REFERENCES "declaracion_carga"("id_declaracion") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "formato_generado"
  ADD CONSTRAINT "formato_generado_id_generado_por_fkey"
  FOREIGN KEY ("id_generado_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
