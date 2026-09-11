import { Module } from '@nestjs/common';
import { BillOfMaterialsService } from './bill-of-materials.service.js';
import { BillOfMaterialsController } from './bill-of-materials.controller.js';
import { ProductsModule } from '../products/products.module.js';
import { BomCommand } from './cli/bom.command.js';
import { BomCreateCommand } from './cli/bom-create.command.js';
import { BomListCommand } from './cli/bom-list.command.js';
import { BomTreeCommand } from './cli/bom-tree.command.js';
import { BomExplodeCommand } from './cli/bom-explode.command.js';

@Module({
  imports: [ProductsModule],
  controllers: [BillOfMaterialsController],
  providers: [
    BillOfMaterialsService,
    BomCommand,
    BomCreateCommand,
    BomListCommand,
    BomTreeCommand,
    BomExplodeCommand,
  ],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}
