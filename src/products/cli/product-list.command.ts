import { CommandRunner, SubCommand } from 'nest-commander';
import { ProductsService } from '../products.service.js';

@SubCommand({ name: 'list', description: 'Ürünleri listeler' })
export class ProductListCommand extends CommandRunner {
  constructor(private readonly productsService: ProductsService) {
    super();
  }

  async run(): Promise<void> {
    const products = await this.productsService.findAll();
    if (products.length === 0) {
      console.log('Kayıtlı ürün yok.');
      return;
    }
    console.table(
      products.map((product) => ({
        code: product.code,
        name: product.name,
        type: product.type,
        unit: product.unit,
        costPrice: product.costPrice?.toString() ?? '-',
        salePrice: product.salePrice?.toString() ?? '-',
        isActive: product.isActive,
      })),
    );
    console.log(`${products.length} ürün`);
  }
}
