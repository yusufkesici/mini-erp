import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';
import { CustomersService } from '../../customers/customers.service.js';

interface SalesOrderHistoryOptions {
  customerCode: string;
}

@SubCommand({ name: 'history', description: 'Bir müşterinin sipariş geçmişini gösterir' })
export class SalesOrderHistoryCommand extends CommandRunner {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly customersService: CustomersService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: SalesOrderHistoryOptions): Promise<void> {
    let customer;
    try {
      customer = await this.customersService.findByCode(options.customerCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const orders = await this.salesOrdersService.findByCustomer(customer.id);
    if (orders.length === 0) {
      console.log(`${customer.code} için kayıtlı sipariş yok.`);
      return;
    }
    console.table(
      orders.map((order) => ({
        status: order.status,
        items: order.items.length,
        total: order.items.reduce((sum, item) => sum + item.quantity.toNumber() * item.unitPrice.toNumber(), 0).toFixed(2),
        orderDate: order.orderDate.toISOString(),
      })),
    );
    console.log(`${customer.code} için ${orders.length} sipariş`);
  }

  @Option({ flags: '-c, --customer-code <customerCode>', description: 'Müşteri kodu' })
  parseCustomerCode(val: string): string {
    return val;
  }
}
