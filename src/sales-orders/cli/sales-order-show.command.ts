import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';

interface SalesOrderShowOptions {
  id: string;
}

@SubCommand({ name: 'show', description: 'Bir satış siparişinin kalemlerini (id dahil) gösterir' })
export class SalesOrderShowCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(_passedParams: string[], options: SalesOrderShowOptions): Promise<void> {
    let order;
    try {
      order = await this.salesOrdersService.findOne(options.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    console.log(`Sipariş ${order.id} — ${order.customer.code} — ${order.status}`);
    console.table(
      order.items.map((item) => ({
        itemId: item.id,
        product: item.product.code,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
    );
  }

  @Option({ flags: '-i, --id <id>', description: 'Sipariş id' })
  parseId(val: string): string {
    return val;
  }
}
