import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { LocationsController } from './locations.controller.js';
import { WarehousesModule } from '../warehouses/warehouses.module.js';
import { LocationCommand } from './cli/location.command.js';
import { LocationCreateCommand } from './cli/location-create.command.js';
import { LocationListCommand } from './cli/location-list.command.js';

@Module({
  imports: [WarehousesModule],
  controllers: [LocationsController],
  providers: [LocationsService, LocationCommand, LocationCreateCommand, LocationListCommand],
  exports: [LocationsService],
})
export class LocationsModule {}
