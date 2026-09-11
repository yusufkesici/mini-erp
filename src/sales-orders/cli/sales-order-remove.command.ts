import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';

interface SalesOrderRemoveOptions {
  id: string;
}

@SubCommand({
  name: 'remove',
  description: 'Beklemedeki (PENDING) bir siparişi siler',
})
export class SalesOrderRemoveCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: SalesOrderRemoveOptions,
  ): Promise<void> {
    try {
      await this.salesOrdersService.remove(options.id);
      console.log(`Sipariş silindi: ${options.id}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  }

  @Option({ flags: '-i, --id <id>', description: 'Sipariş id' })
  parseId(val: string): string {
    return val;
  }
}
