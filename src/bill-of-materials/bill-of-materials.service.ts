import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

@Injectable()
export class BillOfMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBomDto) {
    return this.prisma.billOfMaterial.create({
      data: {
        productId: dto.productId,
        name: dto.name,
        outputQuantity: dto.outputQuantity,
        isActive: dto.isActive,
        items: { create: dto.items.map((item) => ({ componentProductId: item.componentProductId, quantity: item.quantity })) },
      },
      include: { items: true },
    });
  }

  findAll() {
    return this.prisma.billOfMaterial.findMany({ include: { product: true, items: true } });
  }

  async findOne(id: string) {
    const bom = await this.prisma.billOfMaterial.findUnique({
      where: { id },
      include: { product: true, items: { include: { component: true } } },
    });
    if (!bom) {
      throw new NotFoundException(`Ürün ağacı ${id} bulunamadı`);
    }
    return bom;
  }

  // Bir ürünün o an geçerli tarifi — üretim emri açarken bomId verilmezse buradan çözülür
  async findActiveForProduct(productId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { productId, isActive: true },
      include: { items: true },
    });
    if (!bom) {
      throw new NotFoundException(`Ürün ${productId} için aktif bir ürün ağacı (BOM) bulunamadı`);
    }
    return bom;
  }

  async update(id: string, dto: UpdateBomDto) {
    await this.findOne(id);
    return this.prisma.billOfMaterial.update({
      where: { id },
      data: {
        name: dto.name,
        outputQuantity: dto.outputQuantity,
        isActive: dto.isActive,
        // items gönderildiyse mevcut satırları tamamen değiştir
        ...(dto.items
          ? {
              items: {
                deleteMany: {},
                create: dto.items.map((item) => ({ componentProductId: item.componentProductId, quantity: item.quantity })),
              },
            }
          : {}),
      },
      include: { items: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.billOfMaterial.delete({ where: { id } });
  }
}
