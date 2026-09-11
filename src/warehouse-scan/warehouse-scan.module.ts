import { Module } from '@nestjs/common';
import { WarehouseScanService } from './warehouse-scan.service.js';
import { WarehouseScanController } from './warehouse-scan.controller.js';
import { LocationsModule } from '../locations/locations.module.js';
import { ProductsModule } from '../products/products.module.js';
import { StockMovementsModule } from '../stock-movements/stock-movements.module.js';

@Module({
  imports: [LocationsModule, ProductsModule, StockMovementsModule],
  controllers: [WarehouseScanController],
  providers: [WarehouseScanService],
})
export class WarehouseScanModule {}
