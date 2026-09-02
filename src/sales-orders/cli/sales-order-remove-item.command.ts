import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';

interface SalesOrderRemoveItemOptions {
  orderId: string;
  itemId: string;
}

@SubCommand({ name: 'remove-item', description: 'Sipariş kalemini siler' })
export class SalesOrderRemoveItemCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(_passedParams: string[], options: SalesOrderRemoveItemOptions): Promise<void> {
    try {
      await this.salesOrdersService.removeItem(options.orderId, options.itemId);
      console.log(`Sipariş kalemi silindi: ${options.itemId}`);
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
}
