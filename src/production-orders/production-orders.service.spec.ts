import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillOfMaterialsService } from '../bill-of-materials/bill-of-materials.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import { LocationsService } from '../locations/locations.service.js';

// Gerçek dünya örneği: Bisiklet (BIKE) üretim emri, BOM patlatması Tekerlek Seti'ni (ara mamul,
// isLeaf:false) ve Jant/Lastik'i (ham madde, isLeaf:true) döner — reportProduction'ın yalnızca
// yaprak bileşenleri stoktan düştüğünü, ara mamulü atladığını kanıtlamak için.
function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'PO-1',
    productId: 'BIKE',
    bomId: 'BOM-1',
    warehouseId: 'WH-1',
    plannedQuantity: 5,
    producedQuantity: 0,
    status: 'PLANNED',
    ...overrides,
  };
}

describe('ProductionOrdersService — reportProduction (aşamalı üretim bildirimi)', () => {
  let service: ProductionOrdersService;
  let prisma: {
    productionOrder: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let billOfMaterialsService: { explodeForBom: ReturnType<typeof vi.fn> };
  let stockMovementsService: {
    createManyInTransaction: ReturnType<typeof vi.fn>;
  };
  let order: ReturnType<typeof createOrder>;

  beforeEach(async () => {
    order = createOrder();
    prisma = {
      productionOrder: {
        findUnique: vi.fn(() => Promise.resolve(order)),
        update: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Gerçek Prisma'daki { increment } davranışını simüle eder
          if (
            data.producedQuantity &&
            typeof data.producedQuantity === 'object'
          ) {
            const inc = (data.producedQuantity as { increment: number })
              .increment;
            order.producedQuantity = (order.producedQuantity as number) + inc;
          } else if (data.producedQuantity !== undefined) {
            order.producedQuantity = data.producedQuantity;
          }
          if (data.status !== undefined) order.status = data.status;
          return Promise.resolve({ ...order });
        }),
      },
      $transaction: vi.fn((fn: (tx: unknown) => unknown, _opts?: unknown) =>
        fn(prisma),
      ),
    };
    billOfMaterialsService = {
      explodeForBom: vi.fn((_bomId: string, quantity: number) =>
        Promise.resolve({
          tree: {} as never,
          lines: [
            {
              productId: 'WHEEL',
              productCode: 'WHEEL-1',
              productName: 'Tekerlek Seti',
              quantity: quantity * 2,
              isLeaf: false,
            },
            {
              productId: 'RIM',
              productCode: 'RIM-1',
              productName: 'Jant',
              quantity: quantity * 4,
              isLeaf: true,
            },
            {
              productId: 'TIRE',
              productCode: 'TIRE-1',
              productName: 'Lastik',
              quantity: quantity * 4,
              isLeaf: true,
            },
          ],
        }),
      ),
    };
    stockMovementsService = {
      createManyInTransaction: vi.fn(() => Promise.resolve([])),
    };
    const locationsService = {
      findDefaultForWarehouse: vi.fn(() =>
        Promise.resolve({ id: 'LOC-DEFAULT' }),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillOfMaterialsService, useValue: billOfMaterialsService },
        { provide: StockMovementsService, useValue: stockMovementsService },
        { provide: LocationsService, useValue: locationsService },
      ],
    }).compile();
    service = module.get(ProductionOrdersService);
  });

  it("ilk bildirim: BOM'u ARTIŞ miktarıyla (plannedQuantity ile değil) patlatır, yalnızca yaprak bileşenleri PRODUCTION_CONSUME_OUT ile tüketir, tek PRODUCTION_IN ekler, PLANNED -> IN_PROGRESS'e otomatik geçer", async () => {
    const result = await service.reportProduction('PO-1', {
      quantity: 2,
    } as never);

    expect(billOfMaterialsService.explodeForBom).toHaveBeenCalledWith(
      'BOM-1',
      2,
    );
    expect(stockMovementsService.createManyInTransaction).toHaveBeenCalledTimes(
      1,
    );

    const [, movements] = stockMovementsService.createManyInTransaction.mock
      .calls[0] as [unknown, unknown[]];
    expect(movements).toEqual([
      {
        productId: 'RIM',
        locationId: 'LOC-DEFAULT',
        type: 'PRODUCTION_CONSUME_OUT',
        quantity: 8,
        productionOrderId: 'PO-1',
        note: expect.any(String),
      },
      {
        productId: 'TIRE',
        locationId: 'LOC-DEFAULT',
        type: 'PRODUCTION_CONSUME_OUT',
        quantity: 8,
        productionOrderId: 'PO-1',
        note: expect.any(String),
      },
      {
        productId: 'BIKE',
        locationId: 'LOC-DEFAULT',
        type: 'PRODUCTION_IN',
        quantity: 2,
        productionOrderId: 'PO-1',
        note: expect.any(String),
      },
    ]);
    // Ara mamul (WHEEL, isLeaf:false) hiçbir hareket olarak geçmemeli
    expect(
      movements.some((m) => (m as { productId: string }).productId === 'WHEEL'),
    ).toBe(false);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.producedQuantity).toBe(2);
  });

  it('ikinci bildirim: producedQuantity ÜZERİNE YAZMAZ, ARTIRIR (increment) ve IN_PROGRESS durumunda kalır', async () => {
    await service.reportProduction('PO-1', { quantity: 2 } as never);
    const second = await service.reportProduction('PO-1', {
      quantity: 3,
    } as never);

    expect(billOfMaterialsService.explodeForBom).toHaveBeenNthCalledWith(
      2,
      'BOM-1',
      3,
    );
    expect(second.producedQuantity).toBe(5); // 2 + 3
    expect(second.status).toBe('IN_PROGRESS'); // ikinci çağrıda PLANNED->IN_PROGRESS ataması tekrarlanmaz
  });

  it("toplam bildirilen miktar plannedQuantity'yi aşsa bile reddedilmez (fazla üretime izin var)", async () => {
    await service.reportProduction('PO-1', { quantity: 3 } as never);
    const result = await service.reportProduction('PO-1', {
      quantity: 3,
    } as never);
    expect(result.producedQuantity).toBe(6); // plannedQuantity=5'i aştı, yine de kabul edildi
  });

  it('COMPLETED durumundaki bir emre üretim bildirimi yapılamaz', async () => {
    order.status = 'COMPLETED';
    await expect(
      service.reportProduction('PO-1', { quantity: 1 } as never),
    ).rejects.toThrow(BadRequestException);
    expect(billOfMaterialsService.explodeForBom).not.toHaveBeenCalled();
  });

  it('CANCELLED durumundaki bir emre üretim bildirimi yapılamaz', async () => {
    order.status = 'CANCELLED';
    await expect(
      service.reportProduction('PO-1', { quantity: 1 } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('bir bileşende stok yetersizse (createManyInTransaction reddederse) hata dışarı fırlar', async () => {
    stockMovementsService.createManyInTransaction.mockRejectedValueOnce(
      new BadRequestException('Yetersiz stok'),
    );
    await expect(
      service.reportProduction('PO-1', { quantity: 2 } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('var olmayan bir üretim emri için NotFoundException fırlatır', async () => {
    prisma.productionOrder.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.reportProduction('YOK', { quantity: 1 } as never),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('ProductionOrdersService — updateStatus (saf durum geçişi, stok/BOM etkisi yok)', () => {
  let service: ProductionOrdersService;
  let prisma: {
    productionOrder: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let billOfMaterialsService: { explodeForBom: ReturnType<typeof vi.fn> };
  let stockMovementsService: {
    createManyInTransaction: ReturnType<typeof vi.fn>;
  };
  let order: ReturnType<typeof createOrder>;

  beforeEach(async () => {
    order = createOrder({ producedQuantity: 3, status: 'IN_PROGRESS' }); // kısmen üretilmiş bir emir
    prisma = {
      productionOrder: {
        findUnique: vi.fn(() => Promise.resolve(order)),
        update: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          Object.assign(order, data);
          return Promise.resolve({ ...order });
        }),
      },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    billOfMaterialsService = { explodeForBom: vi.fn() };
    stockMovementsService = { createManyInTransaction: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillOfMaterialsService, useValue: billOfMaterialsService },
        { provide: StockMovementsService, useValue: stockMovementsService },
        { provide: LocationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProductionOrdersService);
  });

  it("IN_PROGRESS -> COMPLETED: eksik üretimle (producedQuantity 3 < plannedQuantity 5) bile kabul edilir, BOM'a/stoğa HİÇ dokunmaz (kısmi/erken kapanış)", async () => {
    const result = await service.updateStatus('PO-1', {
      status: 'COMPLETED',
    } as never);

    expect(billOfMaterialsService.explodeForBom).not.toHaveBeenCalled();
    expect(
      stockMovementsService.createManyInTransaction,
    ).not.toHaveBeenCalled();
    expect(result.status).toBe('COMPLETED');
    expect(result.producedQuantity).toBe(3); // değişmedi, kalan 2 için hiçbir şey olmadı
  });

  it('zaten COMPLETED olan bir emri tekrar COMPLETED yapmaya çalışmak BadRequestException fırlatır', async () => {
    order.status = 'COMPLETED';
    await expect(
      service.updateStatus('PO-1', { status: 'COMPLETED' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('CANCELLED bir emir COMPLETED durumuna geçirilemez', async () => {
    order.status = 'CANCELLED';
    await expect(
      service.updateStatus('PO-1', { status: 'COMPLETED' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('COMPLETED bir emir IN_PROGRESS durumuna yeniden açılabilir (eksik üretim bildirimi yapabilmek için)', async () => {
    order.status = 'COMPLETED';
    const result = await service.updateStatus('PO-1', {
      status: 'IN_PROGRESS',
    } as never);

    expect(result.status).toBe('IN_PROGRESS');
  });

  it('CANCELLED bir emir IN_PROGRESS durumuna geçirilemez', async () => {
    order.status = 'CANCELLED';
    await expect(
      service.updateStatus('PO-1', { status: 'IN_PROGRESS' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('var olmayan bir üretim emri için NotFoundException fırlatır', async () => {
    prisma.productionOrder.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.updateStatus('YOK', { status: 'COMPLETED' } as never),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('ProductionOrdersService — create (trackingType koruması)', () => {
  let service: ProductionOrdersService;
  let prisma: {
    product: { findUnique: ReturnType<typeof vi.fn> };
    productionOrder: { create: ReturnType<typeof vi.fn> };
  };
  let billOfMaterialsService: {
    findActiveForProduct: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: vi.fn() },
      productionOrder: {
        create: vi.fn((args: { data: unknown }) => Promise.resolve(args.data)),
      },
    };
    billOfMaterialsService = {
      findActiveForProduct: vi.fn(() => Promise.resolve({ id: 'BOM-1' })),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillOfMaterialsService, useValue: billOfMaterialsService },
        { provide: StockMovementsService, useValue: {} },
        { provide: LocationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProductionOrdersService);
  });

  it('BARCODE_MANUAL bir ürün için üretim emri açılamaz', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      trackingType: 'BARCODE_MANUAL',
    });
    await expect(
      service.create({
        productId: 'BIKE',
        warehouseId: 'WH-1',
        plannedQuantity: 5,
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(billOfMaterialsService.findActiveForProduct).not.toHaveBeenCalled();
    expect(prisma.productionOrder.create).not.toHaveBeenCalled();
  });

  it('BOM_AUTO bir ürün için üretim emri normal şekilde açılır', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      trackingType: 'BOM_AUTO',
    });
    const result = await service.create({
      productId: 'BIKE',
      warehouseId: 'WH-1',
      plannedQuantity: 5,
    } as never);
    expect(result).toMatchObject({ productId: 'BIKE', bomId: 'BOM-1' });
  });

  it('var olmayan bir ürün için NotFoundException fırlatır', async () => {
    prisma.product.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create({
        productId: 'YOK',
        warehouseId: 'WH-1',
        plannedQuantity: 5,
      } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
