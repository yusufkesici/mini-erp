import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductsService } from '../products.service.js';
import { CreateProductDto } from '../dto/create-product.dto.js';

interface ProductCreateOptions {
  code: string;
  name: string;
  type: string;
  unit?: string;
  barcode?: string;
  description?: string;
  costPrice?: number;
  salePrice?: number;
}

@SubCommand({ name: 'create', description: 'Yeni ürün oluşturur' })
export class ProductCreateCommand extends CommandRunner {
  constructor(private readonly productsService: ProductsService) {
    super();
  }

  async run(_passedParams: string[], options: ProductCreateOptions): Promise<void> {
    const dto = plainToInstance(CreateProductDto, options);
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const product = await this.productsService.create(dto);
    console.log(`Ürün oluşturuldu: ${product.code} (${product.id})`);
  }

  @Option({ flags: '-c, --code <code>', description: 'Ürün kodu (SKU)' })
  parseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name <name>', description: 'Ürün adı' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-t, --type <type>', description: 'RAW_MATERIAL | SEMI_FINISHED | FINISHED_GOOD' })
  parseType(val: string): string {
    return val;
  }

  @Option({ flags: '-u, --unit [unit]', description: 'PIECE | KG | GRAM | LITER | METER | BOX | PACKAGE' })
  parseUnit(val: string): string {
    return val;
  }

  @Option({ flags: '--barcode [barcode]', description: 'Barkod' })
  parseBarcode(val: string): string {
    return val;
  }

  @Option({ flags: '--description [description]', description: 'Açıklama' })
  parseDescription(val: string): string {
    return val;
  }

  @Option({ flags: '--cost-price [costPrice]', description: 'Maliyet fiyatı' })
  parseCostPrice(val: string): number {
    return Number(val);
  }

  @Option({ flags: '--sale-price [salePrice]', description: 'Satış fiyatı' })
  parseSalePrice(val: string): number {
    return Number(val);
  }
}
