import { CommandRunner, SubCommand } from 'nest-commander';
import { ProductionOrdersService } from '../production-orders.service.js';

@SubCommand({ name: 'list', description: 'Üretim emirlerini listeler' })
export class ProductionOrderListCommand extends CommandRunner {
  constructor(private readonly productionOrdersService: ProductionOrdersService) {
    super();
  }

  async run(): Promise<void> {
    const orders = await this.productionOrdersService.findAll();
    if (orders.length === 0) {
      console.log('Kayıtlı üretim emri yok.');
      return;
    }
    console.table(
      orders.map((order) => ({
        id: order.id,
        product: order.product.code,
        warehouse: order.warehouse.code,
        planned: order.plannedQuantity.toString(),
        produced: order.producedQuantity.toString(),
        status: order.status,
      })),
    );
    console.log(`${orders.length} üretim emri`);
  }
}
