import { Module } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { StockController } from './stock.controller.js';
import { ProductsModule } from '../products/products.module.js';
import { WarehousesModule } from '../warehouses/warehouses.module.js';
import { StockCommand } from './cli/stock.command.js';
import { StockCreateCommand } from './cli/stock-create.command.js';
import { StockListCommand } from './cli/stock-list.command.js';

@Module({
  imports: [ProductsModule, WarehousesModule],
  controllers: [StockController],
  providers: [StockService, StockCommand, StockCreateCommand, StockListCommand],
  exports: [StockService],
})
export class StockModule {}
