import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { BillOfMaterialsService } from '../bill-of-materials.service.js';
import { CreateBomDto } from '../dto/create-bom.dto.js';
import { ProductsService } from '../../products/products.service.js';

interface BomCreateOptions {
  productCode: string;
  name?: string;
  outputQuantity?: number;
  component?: string[];
}

@SubCommand({ name: 'create', description: 'Yeni ürün ağacı (BOM) oluşturur' })
export class BomCreateCommand extends CommandRunner {
  constructor(
    private readonly bomService: BillOfMaterialsService,
    private readonly productsService: ProductsService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: BomCreateOptions): Promise<void> {
    const componentEntries = options.component ?? [];
    if (componentEntries.length === 0) {
      console.error('En az bir --component belirtmelisin, örn. --component RM-001:2.5');
      process.exitCode = 1;
      return;
    }

    let product;
    const items: { componentProductId: string; quantity: number }[] = [];
    try {
      product = await this.productsService.findByCode(options.productCode);
      for (const entry of componentEntries) {
        // "KOD:MIKTAR" biçimini ayrıştır
        const [code, qtyRaw] = entry.split(':');
        if (!code || !qtyRaw) {
          throw new Error(`Geçersiz --component değeri: "${entry}" (beklenen biçim: KOD:MIKTAR)`);
        }
        const component = await this.productsService.findByCode(code);
        items.push({ componentProductId: component.id, quantity: Number(qtyRaw) });
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof Error) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const dto = plainToInstance(CreateBomDto, {
      productId: product.id,
      name: options.name,
      outputQuantity: options.outputQuantity,
      items,
    });
    const errors = await validate(dto, { forbidUnknownValues: false });
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const bom = await this.bomService.create(dto);
    console.log(`Ürün ağacı oluşturuldu: ${bom.name ?? bom.id} — ${bom.items.length} bileşen`);
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Çıktı ürününün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name [name]', description: 'Tarif adı' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-o, --output-quantity [outputQuantity]', description: 'Bu tarifin ürettiği miktar (varsayılan 1)' })
  parseOutputQuantity(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '-c, --component <component>',
    description: 'Bileşen KOD:MIKTAR biçiminde, tekrarlanabilir (örn. --component RM-001:2.5)',
  })
  parseComponent(val: string, previous: string[] = []): string[] {
    return [...previous, val];
  }
}
