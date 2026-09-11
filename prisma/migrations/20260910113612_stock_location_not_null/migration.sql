/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the `stocks` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `locationId` on table `stock_movements` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_productId_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_warehouseId_fkey";

-- DropIndex
DROP INDEX "stock_movements_productId_warehouseId_idx";

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "warehouseId",
ALTER COLUMN "locationId" SET NOT NULL;

-- DropTable
DROP TABLE "stocks";
