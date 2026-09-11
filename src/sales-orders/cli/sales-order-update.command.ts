import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto.js';

interface SalesOrderUpdateOptions {
  id: string;
  note?: string;
  orderDate?: string;
}

@SubCommand({
  name: 'update',
  description: 'Sipariş başlığını (not/tarih) günceller',
})
export class SalesOrderUpdateCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: SalesOrderUpdateOptions,
  ): Promise<void> {
    const dto = plainToInstance(UpdateSalesOrderDto, {
      note: options.note,
      orderDate: options.orderDate,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(
          ` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
        );
      }
      process.exitCode = 1;
      return;
    }

    try {
      const order = await this.salesOrdersService.update(options.id, dto);
      console.log(`Sipariş güncellendi: ${order.id}`);
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

  @Option({ flags: '-n, --note [note]', description: 'Yeni not' })
  parseNote(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --order-date [orderDate]',
    description: 'Yeni sipariş tarihi (ISO)',
  })
  parseOrderDate(val: string): string {
    return val;
  }
}
