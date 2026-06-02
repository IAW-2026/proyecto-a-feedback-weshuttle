-- AlterEnum
ALTER TYPE "EstadoReseña" ADD VALUE 'PRECREATED';

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "estado_reseña" SET DEFAULT 'PRECREATED';
