import { CommandRunner, SubCommand } from 'nest-commander';
import { BillOfMaterialsService } from '../bill-of-materials.service.js';

@SubCommand({ name: 'list', description: 'Ürün ağaçlarını (BOM) listeler' })
export class BomListCommand extends CommandRunner {
  constructor(private readonly bomService: BillOfMaterialsService) {
    super();
  }

  async run(): Promise<void> {
    const boms = await this.bomService.findAll();
    if (boms.length === 0) {
      console.log('Kayıtlı ürün ağacı yok.');
      return;
    }
    console.table(
      boms.map((bom) => ({
        product: bom.product.code,
        name: bom.name ?? '-',
        outputQuantity: bom.outputQuantity.toString(),
        items: bom.items.length,
        isActive: bom.isActive,
      })),
    );
    console.log(`${boms.length} ürün ağacı`);
  }
}
