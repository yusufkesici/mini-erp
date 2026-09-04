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
  // hareketi olarak işlenir — Stock.quantity, StockMovement ledger'ından bağımsız bir
  // değerle asla oluşturulmaz (bkz. StockMovementsService.create'in Stock upsert'i).
  async create(dto: CreateStockDto) {
    const quantity = dto.quantity ?? 0;
    if (quantity === 0) {
      return this.prisma.stock.create({
        data: {
          product: { connect: { id: dto.productId } },
          warehouse: { connect: { id: dto.warehouseId } },
          minStockLevel: dto.minStockLevel,
        },
      });
    }

    await this.stockMovementsService.create({
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      type: 'ADJUSTMENT_IN',
      quantity,
      note: 'Başlangıç stok kaydı',
    });
    const where = { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } };
    if (dto.minStockLevel !== undefined) {
      return this.prisma.stock.update({ where, data: { minStockLevel: dto.minStockLevel } });
    }
    return this.prisma.stock.findUniqueOrThrow({ where });
  }

  findAll() {
    return this.prisma.stock.findMany({ include: { product: true, warehouse: true } });
  }

  async findOne(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });
    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }
    return stock;
  }

  async update(id: string, dto: UpdateStockDto) {
    await this.findOne(id);
    return this.prisma.stock.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.stock.delete({ where: { id } });
  }
}
