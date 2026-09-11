/*
  Warnings:

  - Made the column `warehouseId` on table `sales_orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sales_orders" ALTER COLUMN "warehouseId" SET NOT NULL;
