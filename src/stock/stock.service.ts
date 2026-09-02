import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockDto } from './dto/create-stock.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStockDto) {
    return this.prisma.stock.create({
      data: {
        product: { connect: { id: dto.productId } },
        warehouse: { connect: { id: dto.warehouseId } },
        quantity: dto.quantity,
        minStockLevel: dto.minStockLevel,
      },
    });
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
