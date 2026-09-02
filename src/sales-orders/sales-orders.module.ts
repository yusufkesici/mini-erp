import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { SalesOrdersController } from './sales-orders.controller.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ProductsModule } from '../products/products.module.js';
import { SalesOrderCommand } from './cli/sales-order.command.js';
import { SalesOrderCreateCommand } from './cli/sales-order-create.command.js';
import { SalesOrderListCommand } from './cli/sales-order-list.command.js';
import { SalesOrderHistoryCommand } from './cli/sales-order-history.command.js';

@Module({
  imports: [CustomersModule, ProductsModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, SalesOrderCommand, SalesOrderCreateCommand, SalesOrderListCommand, SalesOrderHistoryCommand],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
