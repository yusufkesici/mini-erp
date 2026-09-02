import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { Prisma, StockMovementType } from '../generated/prisma/client.js';

const INBOUND_TYPES: StockMovementType[] = ['PURCHASE_IN', 'PRODUCTION_IN', 'ADJUSTMENT_IN'];

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Her hareket, Stock önbelleğinin (quantity) aynı transaction içinde güncellenmesini garantiler.
  // Çıkış hareketlerinde stok negatife düşecekse işlem reddedilir; Serializable izolasyon,
  // aynı ürün+depo için eşzamanlı iki çıkışın kontrolü birlikte geçip stoğu birlikte
  // eksiye düşürmesini (race condition) engeller — çakışan işlem Prisma tarafında hata olarak döner.
  async create(dto: CreateStockMovementDto) {
    const isInbound = INBOUND_TYPES.includes(dto.type);
    const delta = isInbound ? dto.quantity : -dto.quantity;

    return this.prisma.$transaction(
      async (tx) => {
        if (!isInbound) {
          const stock = await tx.stock.findUnique({
            where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
          });
          const currentQuantity = stock?.quantity ?? new Prisma.Decimal(0);
          if (currentQuantity.lessThan(dto.quantity)) {
            throw new BadRequestException(
              `Yetersiz stok: mevcut ${currentQuantity.toString()}, istenen ${dto.quantity}`,
            );
          }
        }

        const movement = await tx.stockMovement.create({ data: dto });
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
          create: { productId: dto.productId, warehouseId: dto.warehouseId, quantity: delta },
          update: { quantity: { increment: delta } },
        });

        return movement;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  findAll() {
    return this.prisma.stockMovement.findMany({
      include: { product: true, warehouse: true, productionOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: { product: true, warehouse: true, productionOrder: true },
    });
    if (!movement) {
      throw new NotFoundException(`Stok hareketi ${id} bulunamadı`);
    }
    return movement;
  }
}
