import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import { CreateStockDto } from './dto/create-stock.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  // Sıfırdan büyük bir başlangıç miktarı, StockMovementsService üzerinden ADJUSTMENT_IN
  // hareketi olarak işlenir — StockLevel.quantity, StockMovement ledger'ından bağımsız bir
  // değerle asla oluşturulmaz (bkz. StockMovementsService.create'in StockLevel upsert'i).
  async create(dto: CreateStockDto) {
    const quantity = dto.quantity ?? 0;
    if (quantity === 0) {
      return this.prisma.stockLevel.create({
        data: {
          product: { connect: { id: dto.productId } },
          location: { connect: { id: dto.locationId } },
          minStockLevel: dto.minStockLevel,
        },
      });
    }

    await this.stockMovementsService.create({
      productId: dto.productId,
      locationId: dto.locationId,
      type: 'ADJUSTMENT_IN',
      quantity,
      note: 'Başlangıç stok kaydı',
    });
    const where = { productId_locationId: { productId: dto.productId, locationId: dto.locationId } };
    if (dto.minStockLevel !== undefined) {
      return this.prisma.stockLevel.update({ where, data: { minStockLevel: dto.minStockLevel } });
    }
    return this.prisma.stockLevel.findUniqueOrThrow({ where });
  }

  findAll() {
    return this.prisma.stockLevel.findMany({
      include: { product: true, location: { include: { warehouse: true } } },
    });
  }

  async findOne(id: string) {
    const stockLevel = await this.prisma.stockLevel.findUnique({
      where: { id },
      include: { product: true, location: { include: { warehouse: true } } },
    });
    if (!stockLevel) {
      throw new NotFoundException(`Stock level ${id} not found`);
    }
    return stockLevel;
  }

  async update(id: string, dto: UpdateStockDto) {
    await this.findOne(id);
    return this.prisma.stockLevel.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.stockLevel.delete({ where: { id } });
  }
}
