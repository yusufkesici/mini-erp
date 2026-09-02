import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { StockService } from '../stock.service.js';
import { CreateStockDto } from '../dto/create-stock.dto.js';
import { ProductsService } from '../../products/products.service.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';

interface StockCreateOptions {
  productCode: string;
  warehouseCode: string;
  quantity?: number;
  minStockLevel?: number;
}

@SubCommand({ name: 'create', description: 'Ürün/depo için stok kaydı oluşturur' })
export class StockCreateCommand extends CommandRunner {
  constructor(
    private readonly stockService: StockService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: StockCreateOptions): Promise<void> {
    let product;
    let warehouse;
    try {
      product = await this.productsService.findByCode(options.productCode);
      warehouse = await this.warehousesService.findByCode(options.warehouseCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const dto = plainToInstance(CreateStockDto, {
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: options.quantity,
      minStockLevel: options.minStockLevel,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const stock = await this.stockService.create(dto);
    console.log(`Stok oluşturuldu: ${product.code} @ ${warehouse.code} = ${stock.quantity}`);
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Ürün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --warehouse-code <warehouseCode>', description: 'Depo kodu' })
  parseWarehouseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-q, --quantity [quantity]', description: 'Miktar' })
  parseQuantity(val: string): number {
    return Number(val);
  }

  @Option({ flags: '-m, --min-stock-level [minStockLevel]', description: 'Kritik stok seviyesi' })
  parseMinStockLevel(val: string): number {
    return Number(val);
  }
}
