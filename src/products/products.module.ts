import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { ProductCommand } from './cli/product.command.js';
import { ProductCreateCommand } from './cli/product-create.command.js';
import { ProductListCommand } from './cli/product-list.command.js';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductCommand, ProductCreateCommand, ProductListCommand],
  exports: [ProductsService],
})
export class ProductsModule {}
