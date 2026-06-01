-- Expand environment code length to support full room names from the seed
ALTER TABLE "ambiente"
ALTER COLUMN "codigo" TYPE VARCHAR(100);
