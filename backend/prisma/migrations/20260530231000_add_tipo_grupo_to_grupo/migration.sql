-- Añade el enum TipoGrupo y la columna tipo_grupo a la tabla grupo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipogrupo') THEN
    CREATE TYPE "TipoGrupo" AS ENUM ('UNICO_TEORIA', 'UNICO_PRACTICA', 'LABORATORIO_N');
  END IF;
END$$;

ALTER TABLE "grupo"
  ADD COLUMN IF NOT EXISTS "tipo_grupo" "TipoGrupo" NOT NULL DEFAULT 'UNICO_TEORIA';
