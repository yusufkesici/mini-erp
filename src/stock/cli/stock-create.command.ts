import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { StockService } from '../stock.service.js';
import { CreateStockDto } from '../dto/create-stock.dto.js';
import { ProductsService } from '../../products/products.service.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';
import { LocationsService } from '../../locations/locations.service.js';

interface StockCreateOptions {
  productCode: string;
  locationCode?: string;
  warehouseCode?: string;
  quantity?: number;
  minStockLevel?: number;
}

@SubCommand({ name: 'create', description: 'Ürün/konum için stok kaydı oluşturur' })
export class StockCreateCommand extends CommandRunner {
  constructor(
    private readonly stockService: StockService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: StockCreateOptions): Promise<void> {
    if (!options.locationCode && !options.warehouseCode) {
      console.error('--location-code veya --warehouse-code belirtilmeli');
      process.exitCode = 1;
      return;
    }

    let product;
    let locationId: string;
    let locationLabel: string;
    try {
      product = await this.productsService.findByCode(options.productCode);
      // --location-code doğrudan bir rafı hedefler; --warehouse-code verilirse o depo'nun
      // otomatik "Genel Alan" rafına çözümlenir (bkz. LocationsService.findDefaultForWarehouse).
      if (options.locationCode) {
        const location = await this.locationsService.findByCode(options.locationCode);
        locationId = location.id;
        locationLabel = location.code;
      } else {
        const warehouse = await this.warehousesService.findByCode(options.warehouseCode!);
        const location = await this.locationsService.findDefaultForWarehouse(warehouse.id);
        locationId = location.id;
        locationLabel = `${warehouse.code} (${location.code})`;
      }
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
      locationId,
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
    console.log(`Stok oluşturuldu: ${product.code} @ ${locationLabel} = ${stock.quantity}`);
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Ürün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-l, --location-code [locationCode]', description: 'Konum (raf) kodu' })
  parseLocationCode(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --warehouse-code [warehouseCode]', description: "Depo kodu (depo'nun Genel Alan rafını kullanır)" })
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
