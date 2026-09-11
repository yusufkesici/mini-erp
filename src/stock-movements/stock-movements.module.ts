import { Module } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service.js';
import { StockMovementsController } from './stock-movements.controller.js';
import { ProductsModule } from '../products/products.module.js';
import { WarehousesModule } from '../warehouses/warehouses.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { StockMovementCommand } from './cli/stock-movement.command.js';
import { StockMovementCreateCommand } from './cli/stock-movement-create.command.js';
import { StockMovementListCommand } from './cli/stock-movement-list.command.js';

@Module({
  imports: [ProductsModule, WarehousesModule, LocationsModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService, StockMovementCommand, StockMovementCreateCommand, StockMovementListCommand],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
