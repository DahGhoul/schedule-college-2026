-- Add missing 8-hour part-time option used in legacy carga horaria flow
ALTER TYPE "DedicacionDocente" ADD VALUE IF NOT EXISTS 'TIEMPO_PARCIAL_8H';
