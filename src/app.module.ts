import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApiKeyGuard } from './auth/api-key.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { WarehousesModule } from './warehouses/warehouses.module.js';
import { StockModule } from './stock/stock.module.js';
import { BillOfMaterialsModule } from './bill-of-materials/bill-of-materials.module.js';
import { ProductionOrdersModule } from './production-orders/production-orders.module.js';
import { StockMovementsModule } from './stock-movements/stock-movements.module.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { SalesOrdersModule } from './sales-orders/sales-orders.module.js';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    WarehousesModule,
    StockModule,
    BillOfMaterialsModule,
    ProductionOrdersModule,
    StockMovementsModule,
    AccountingModule,
    CustomersModule,
    SalesOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
