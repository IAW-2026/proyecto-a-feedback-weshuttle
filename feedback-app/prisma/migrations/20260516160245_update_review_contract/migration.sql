/*
  Warnings:

  - You are about to drop the column `comment` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `driverId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `passengerId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Review` table. All the data in the column will be lost.
  - Added the required column `autor_id` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinatario_id` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pool_id` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoReseña" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "comment",
DROP COLUMN "driverId",
DROP COLUMN "passengerId",
DROP COLUMN "rating",
ADD COLUMN     "autor_id" TEXT NOT NULL,
ADD COLUMN     "calificacion" INTEGER,
ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "destinatario_id" TEXT NOT NULL,
ADD COLUMN     "estado_reseña" "EstadoReseña" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pool_id" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
