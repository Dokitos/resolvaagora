-- AlterEnum
-- Adiciona as especialidades em falta para cobrir todas as categorias
-- oferecidas na app do cliente. IF NOT EXISTS torna a migração idempotente.
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'PAINTING';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'FURNITURE';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'CLEANING';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'LOCKSMITH';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'GARDEN';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'FLOORING';
ALTER TYPE "Specialty" ADD VALUE IF NOT EXISTS 'TV_ANTENNA';
