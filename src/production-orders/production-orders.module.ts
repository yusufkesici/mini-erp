import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service.js';
import { ProductionOrdersController } from './production-orders.controller.js';
import { ProductsModule } from '../products/products.module.js';
import { WarehousesModule } from '../warehouses/warehouses.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { BillOfMaterialsModule } from '../bill-of-materials/bill-of-materials.module.js';
import { StockMovementsModule } from '../stock-movements/stock-movements.module.js';
import { ProductionOrderCommand } from './cli/production-order.command.js';
import { ProductionOrderCreateCommand } from './cli/production-order-create.command.js';
import { ProductionOrderListCommand } from './cli/production-order-list.command.js';

@Module({
  imports: [
    ProductsModule,
    WarehousesModule,
    LocationsModule,
    BillOfMaterialsModule,
    StockMovementsModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    ProductionOrderCommand,
    ProductionOrderCreateCommand,
    ProductionOrderListCommand,
  ],
  exports: [ProductionOrdersService],
})
export class ProductionOrdersModule {}
