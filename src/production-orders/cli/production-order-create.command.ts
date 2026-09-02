import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { ProductionOrdersService } from '../production-orders.service.js';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto.js';
import { ProductsService } from '../../products/products.service.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';

interface ProductionOrderCreateOptions {
  productCode: string;
  warehouseCode: string;
  bomId?: string;
  plannedQuantity: number;
}

@SubCommand({ name: 'create', description: 'Yeni üretim emri oluşturur' })
export class ProductionOrderCreateCommand extends CommandRunner {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: ProductionOrderCreateOptions): Promise<void> {
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

    const dto = plainToInstance(CreateProductionOrderDto, {
      productId: product.id,
      warehouseId: warehouse.id,
      bomId: options.bomId,
      plannedQuantity: options.plannedQuantity,
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

    try {
      const order = await this.productionOrdersService.create(dto);
      console.log(`Üretim emri oluşturuldu: ${order.id} — ${product.code} × ${order.plannedQuantity} (${order.status})`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Üretilecek ürünün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --warehouse-code <warehouseCode>', description: 'Üretim deposunun kodu' })
  parseWarehouseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-q, --planned-quantity <plannedQuantity>', description: 'Planlanan üretim miktarı' })
  parsePlannedQuantity(val: string): number {
    return Number(val);
  }

  @Option({ flags: '-b, --bom-id [bomId]', description: 'Kullanılacak BOM id (verilmezse aktif BOM otomatik seçilir)' })
  parseBomId(val: string): string {
    return val;
  }
}
