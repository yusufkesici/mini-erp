import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';
import { UpdateSalesOrderItemDto } from '../dto/update-sales-order-item.dto.js';

interface SalesOrderUpdateItemOptions {
  orderId: string;
  itemId: string;
  quantity?: number;
  unitPrice?: number;
}

@SubCommand({ name: 'update-item', description: 'Sipariş kaleminin miktar/fiyatını günceller' })
export class SalesOrderUpdateItemCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(_passedParams: string[], options: SalesOrderUpdateItemOptions): Promise<void> {
    const dto = plainToInstance(UpdateSalesOrderItemDto, {
      quantity: options.quantity,
      unitPrice: options.unitPrice,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    try {
      await this.salesOrdersService.updateItem(options.orderId, options.itemId, dto);
      console.log(`Sipariş kalemi güncellendi: ${options.itemId}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  }

  @Option({ flags: '-o, --order-id <orderId>', description: 'Sipariş id' })
  parseOrderId(val: string): string {
    return val;
  }

  @Option({ flags: '-t, --item-id <itemId>', description: 'Kalem id' })
  parseItemId(val: string): string {
    return val;
  }

  @Option({ flags: '-q, --quantity [quantity]', description: 'Yeni miktar' })
  parseQuantity(val: string): number {
    return Number(val);
  }

  @Option({ flags: '-u, --unit-price [unitPrice]', description: 'Yeni birim fiyat' })
  parseUnitPrice(val: string): number {
    return Number(val);
  }
}
