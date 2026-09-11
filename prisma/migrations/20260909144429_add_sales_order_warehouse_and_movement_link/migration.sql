-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "salesOrderItemId" TEXT;

-- CreateIndex
CREATE INDEX "bill_of_material_items_componentProductId_idx" ON "bill_of_material_items"("componentProductId");

-- CreateIndex
CREATE INDEX "production_orders_bomId_idx" ON "production_orders"("bomId");

-- CreateIndex
CREATE INDEX "production_orders_warehouseId_idx" ON "production_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "sales_order_items_productId_idx" ON "sales_order_items"("productId");

-- CreateIndex
CREATE INDEX "sales_orders_warehouseId_idx" ON "sales_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_movements_salesOrderItemId_idx" ON "stock_movements"("salesOrderItemId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "sales_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
