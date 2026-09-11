import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { SalesOrdersController } from './sales-orders.controller.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ProductsModule } from '../products/products.module.js';
import { WarehousesModule } from '../warehouses/warehouses.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { StockMovementsModule } from '../stock-movements/stock-movements.module.js';
import { SalesOrderCommand } from './cli/sales-order.command.js';
import { SalesOrderCreateCommand } from './cli/sales-order-create.command.js';
import { SalesOrderListCommand } from './cli/sales-order-list.command.js';
import { SalesOrderHistoryCommand } from './cli/sales-order-history.command.js';
import { SalesOrderShowCommand } from './cli/sales-order-show.command.js';
import { SalesOrderUpdateCommand } from './cli/sales-order-update.command.js';
import { SalesOrderRemoveCommand } from './cli/sales-order-remove.command.js';
import { SalesOrderUpdateItemCommand } from './cli/sales-order-update-item.command.js';
import { SalesOrderRemoveItemCommand } from './cli/sales-order-remove-item.command.js';

@Module({
  imports: [
    CustomersModule,
    ProductsModule,
    WarehousesModule,
    LocationsModule,
    StockMovementsModule,
  ],
  controllers: [SalesOrdersController],
  providers: [
    SalesOrdersService,
    SalesOrderCommand,
    SalesOrderCreateCommand,
    SalesOrderListCommand,
    SalesOrderHistoryCommand,
    SalesOrderShowCommand,
    SalesOrderUpdateCommand,
    SalesOrderRemoveCommand,
    SalesOrderUpdateItemCommand,
    SalesOrderRemoveItemCommand,
  ],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
