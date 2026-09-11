import { CommandRunner, SubCommand } from 'nest-commander';
import { StockService } from '../stock.service.js';

@SubCommand({ name: 'list', description: 'Stok kayıtlarını listeler' })
export class StockListCommand extends CommandRunner {
  constructor(private readonly stockService: StockService) {
    super();
  }

  async run(): Promise<void> {
    const stocks = await this.stockService.findAll();
    if (stocks.length === 0) {
      console.log('Kayıtlı stok yok.');
      return;
    }
    console.table(
      stocks.map((stock) => ({
        product: stock.product.code,
        location: stock.location.code,
        warehouse: stock.location.warehouse.code,
        quantity: stock.quantity.toString(),
        minStockLevel: stock.minStockLevel?.toString() ?? '-',
      })),
    );
    console.log(`${stocks.length} stok kaydı`);
  }
}
