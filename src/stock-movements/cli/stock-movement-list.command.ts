import { CommandRunner, SubCommand } from 'nest-commander';
import { StockMovementsService } from '../stock-movements.service.js';

@SubCommand({ name: 'list', description: 'Stok hareketlerini listeler' })
export class StockMovementListCommand extends CommandRunner {
  constructor(private readonly stockMovementsService: StockMovementsService) {
    super();
  }

  async run(): Promise<void> {
    const movements = await this.stockMovementsService.findAll();
    if (movements.length === 0) {
      console.log('Kayıtlı stok hareketi yok.');
      return;
    }
    console.table(
      movements.map((movement) => ({
        product: movement.product.code,
        location: movement.location.code,
        warehouse: movement.location.warehouse.code,
        type: movement.type,
        quantity: movement.quantity.toString(),
        productionOrderId: movement.productionOrderId ?? '-',
        createdAt: movement.createdAt.toISOString(),
      })),
    );
    console.log(`${movements.length} stok hareketi`);
  }
}
