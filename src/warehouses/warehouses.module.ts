import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { WarehousesController } from './warehouses.controller.js';
import { WarehouseCommand } from './cli/warehouse.command.js';
import { WarehouseCreateCommand } from './cli/warehouse-create.command.js';
import { WarehouseListCommand } from './cli/warehouse-list.command.js';

@Module({
  controllers: [WarehousesController],
  providers: [WarehousesService, WarehouseCommand, WarehouseCreateCommand, WarehouseListCommand],
  exports: [WarehousesService],
})
export class WarehousesModule {}
