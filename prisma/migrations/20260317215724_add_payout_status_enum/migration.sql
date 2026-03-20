/*
  Warnings:

  - The `status` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "payouts" DROP COLUMN "status",
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING';
