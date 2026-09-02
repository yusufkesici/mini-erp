import { CommandRunner, SubCommand } from 'nest-commander';
import { SalesOrdersService } from '../sales-orders.service.js';

@SubCommand({ name: 'list', description: 'Satış siparişlerini listeler' })
export class SalesOrderListCommand extends CommandRunner {
  constructor(private readonly salesOrdersService: SalesOrdersService) {
    super();
  }

  async run(): Promise<void> {
    const orders = await this.salesOrdersService.findAll();
    if (orders.length === 0) {
      console.log('Kayıtlı satış siparişi yok.');
      return;
    }
    console.table(
      orders.map((order) => ({
        customer: order.customer.code,
        status: order.status,
        items: order.items.length,
        total: order.items.reduce((sum, item) => sum + item.quantity.toNumber() * item.unitPrice.toNumber(), 0).toFixed(2),
        orderDate: order.orderDate.toISOString(),
      })),
    );
    console.log(`${orders.length} satış siparişi`);
  }
}
