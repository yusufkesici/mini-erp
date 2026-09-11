import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from '../sales-orders.service.js';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto.js';
import { CustomersService } from '../../customers/customers.service.js';
import { ProductsService } from '../../products/products.service.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';

interface SalesOrderCreateOptions {
  customerCode: string;
  warehouseCode: string;
  item?: string[];
  note?: string;
}

@SubCommand({ name: 'create', description: 'Yeni satış siparişi oluşturur' })
export class SalesOrderCreateCommand extends CommandRunner {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options: SalesOrderCreateOptions,
  ): Promise<void> {
    const itemEntries = options.item ?? [];
    if (itemEntries.length === 0) {
      console.error(
        'En az bir --item belirtmelisin, örn. --item SKU-001:2:150.00',
      );
      process.exitCode = 1;
      return;
    }

    let customer;
    let warehouse;
    const items: { productId: string; quantity: number; unitPrice: number }[] =
      [];
    try {
      customer = await this.customersService.findByCode(options.customerCode);
      warehouse = await this.warehousesService.findByCode(
        options.warehouseCode,
      );
      for (const entry of itemEntries) {
        // "KOD:MIKTAR:FIYAT" biçimini ayrıştır
        const [code, qtyRaw, priceRaw] = entry.split(':');
        if (!code || !qtyRaw || !priceRaw) {
          throw new BadRequestException(
            `Geçersiz --item değeri: "${entry}" (beklenen biçim: KOD:MIKTAR:FIYAT)`,
          );
        }
        const product = await this.productsService.findByCode(code);
        items.push({
          productId: product.id,
          quantity: Number(qtyRaw),
          unitPrice: Number(priceRaw),
        });
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const dto = plainToInstance(CreateSalesOrderDto, {
      customerId: customer.id,
      warehouseId: warehouse.id,
      note: options.note,
      items,
    });
    const errors = await validate(dto, { forbidUnknownValues: false });
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(
          ` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
        );
      }
      process.exitCode = 1;
      return;
    }

    const order = await this.salesOrdersService.create(dto);
    console.log(
      `Satış siparişi oluşturuldu: ${customer.code} — ${order.items.length} kalem (${order.id})`,
    );
  }

  @Option({
    flags: '-c, --customer-code <customerCode>',
    description: 'Müşteri kodu',
  })
  parseCustomerCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-w, --warehouse-code <warehouseCode>',
    description: 'Sevkiyat deposunun kodu',
  })
  parseWarehouseCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-i, --item <item>',
    description:
      'Kalem KOD:MIKTAR:FIYAT biçiminde, tekrarlanabilir (örn. --item SKU-001:2:150.00)',
  })
  parseItem(val: string, previous: string[] = []): string[] {
    return [...previous, val];
  }

  @Option({ flags: '-n, --note [note]', description: 'Not' })
  parseNote(val: string): string {
    return val;
  }
}
