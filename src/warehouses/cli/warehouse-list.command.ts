import { CommandRunner, SubCommand } from 'nest-commander';
import { WarehousesService } from '../warehouses.service.js';

@SubCommand({ name: 'list', description: 'Depoları listeler' })
export class WarehouseListCommand extends CommandRunner {
  constructor(private readonly warehousesService: WarehousesService) {
    super();
  }

  async run(): Promise<void> {
    const warehouses = await this.warehousesService.findAll();
    if (warehouses.length === 0) {
      console.log('Kayıtlı depo yok.');
      return;
    }
    console.table(
      warehouses.map((warehouse) => ({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address ?? '-',
        isActive: warehouse.isActive,
      })),
    );
    console.log(`${warehouses.length} depo`);
  }
}
