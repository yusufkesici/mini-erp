import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementsService } from '../stock-movements.service.js';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto.js';
import { ProductsService } from '../../products/products.service.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';

interface StockMovementCreateOptions {
  productCode: string;
  warehouseCode: string;
  type: string;
  quantity: number;
  productionOrderId?: string;
  note?: string;
}

@SubCommand({ name: 'create', description: 'Yeni stok hareketi kaydeder' })
export class StockMovementCreateCommand extends CommandRunner {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: StockMovementCreateOptions): Promise<void> {
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

    const dto = plainToInstance(CreateStockMovementDto, {
      productId: product.id,
      warehouseId: warehouse.id,
      type: options.type,
      quantity: options.quantity,
      productionOrderId: options.productionOrderId,
      note: options.note,
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
      const movement = await this.stockMovementsService.create(dto);
      console.log(`Stok hareketi kaydedildi: ${product.code} @ ${warehouse.code} — ${movement.type} ${movement.quantity}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Ürün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --warehouse-code <warehouseCode>', description: 'Depo kodu' })
  parseWarehouseCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'PURCHASE_IN | SALES_OUT | PRODUCTION_IN | PRODUCTION_CONSUME_OUT | ADJUSTMENT_IN | ADJUSTMENT_OUT',
  })
  parseType(val: string): string {
    return val;
  }

  @Option({ flags: '-q, --quantity <quantity>', description: 'Miktar (her zaman pozitif)' })
  parseQuantity(val: string): number {
    return Number(val);
  }

  @Option({ flags: '--production-order-id [productionOrderId]', description: 'İlişkili üretim emri id (opsiyonel)' })
  parseProductionOrderId(val: string): string {
    return val;
  }

  @Option({ flags: '--note [note]', description: 'Not' })
  parseNote(val: string): string {
    return val;
  }
}
