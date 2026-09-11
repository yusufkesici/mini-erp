import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { Prisma, StockMovementType } from '../generated/prisma/client.js';

const INBOUND_TYPES: StockMovementType[] = [
  'PURCHASE_IN',
  'PRODUCTION_IN',
  'ADJUSTMENT_IN',
  'BARCODE_IN',
];

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Her hareket, Stock önbelleğinin (quantity) aynı transaction içinde güncellenmesini garantiler.
  // Çıkış hareketlerinde stok negatife düşecekse işlem reddedilir; Serializable izolasyon,
  // aynı ürün+depo için eşzamanlı iki çıkışın kontrolü birlikte geçip stoğu birlikte
  // eksiye düşürmesini (race condition) engeller — çakışan işlem Prisma tarafında hata olarak döner.
  async create(dto: CreateStockMovementDto) {
    return this.prisma.$transaction((tx) => this.applyMovement(tx, dto), {
      isolationLevel: 'Serializable',
    });
  }

  // Başka bir servisin (örn. SalesOrdersService sevkiyat akışı) kendi transaction'ı içinde
  // birden fazla hareketi atomik uygulaması için: tek bir kalemde stok yetersizse tüm liste
  // (ve çağıranın tx'e dahil ettiği diğer değişiklikler, örn. sipariş durumu) birlikte geri alınır.
  async createManyInTransaction(
    tx: Prisma.TransactionClient,
    dtos: CreateStockMovementDto[],
  ) {
    const movements = [];
    for (const dto of dtos) {
      movements.push(await this.applyMovement(tx, dto));
    }
    return movements;
  }

  private async applyMovement(
    tx: Prisma.TransactionClient,
    dto: CreateStockMovementDto,
  ) {
    const isInbound = INBOUND_TYPES.includes(dto.type);
    const delta = isInbound ? dto.quantity : -dto.quantity;

    if (!isInbound) {
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.locationId,
          },
        },
      });
      const currentQuantity = stockLevel?.quantity ?? new Prisma.Decimal(0);
      if (currentQuantity.lessThan(dto.quantity)) {
        throw new BadRequestException(
          `Yetersiz stok: mevcut ${currentQuantity.toString()}, istenen ${dto.quantity}`,
        );
      }
    }

    const movement = await tx.stockMovement.create({ data: dto });
    await tx.stockLevel.upsert({
      where: {
        productId_locationId: {
          productId: dto.productId,
          locationId: dto.locationId,
        },
      },
      create: {
        productId: dto.productId,
        locationId: dto.locationId,
        quantity: delta,
      },
      update: { quantity: { increment: delta } },
    });

    return movement;
  }

  findAll() {
    return this.prisma.stockMovement.findMany({
      include: {
        product: true,
        location: { include: { warehouse: true } },
        productionOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: true,
        location: { include: { warehouse: true } },
        productionOrder: true,
      },
    });
    if (!movement) {
      throw new NotFoundException(`Stok hareketi ${id} bulunamadı`);
    }
    return movement;
  }
}
