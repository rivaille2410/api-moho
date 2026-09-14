/*
  Warnings:

  - You are about to drop the column `address` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `warehouses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "address",
ADD COLUMN     "addressDetail" TEXT,
ADD COLUMN     "provinceCode" INTEGER,
ADD COLUMN     "provinceName" TEXT,
ADD COLUMN     "wardCode" INTEGER,
ADD COLUMN     "wardName" TEXT;

-- AlterTable
ALTER TABLE "warehouses" DROP COLUMN "address",
ADD COLUMN     "addressDetail" TEXT,
ADD COLUMN     "provinceCode" INTEGER,
ADD COLUMN     "provinceName" TEXT,
ADD COLUMN     "wardCode" INTEGER,
ADD COLUMN     "wardName" TEXT;
