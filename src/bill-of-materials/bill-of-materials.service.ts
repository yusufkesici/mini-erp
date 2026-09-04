import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

@Injectable()
export class BillOfMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  // isActive true ile oluşturulan (varsayılan da true) bir BOM, aynı ürünün diğer
  // aktif BOM'larını pasife çeker — üründe aynı anda tek aktif BOM garantisi burada sağlanır.
  create(dto: CreateBomDto) {
    const isActive = dto.isActive ?? true;
    return this.prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.billOfMaterial.updateMany({
          where: { productId: dto.productId, isActive: true },
          data: { isActive: false },
        });
      }
      return tx.billOfMaterial.create({
        data: {
          productId: dto.productId,
          name: dto.name,
          outputQuantity: dto.outputQuantity,
          isActive,
          items: { create: dto.items.map((item) => ({ componentProductId: item.componentProductId, quantity: item.quantity })) },
        },
        include: { items: true },
      });
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

  // Bir ürünün o an geçerli tarifi — üretim emri açarken bomId verilmezse buradan çözülür.
  // Normalde üründe tek aktif BOM olur (create/update bunu garanti eder); en son
  // güncellenen kaydı seçmek yalnızca eski/tutarsız veriye karşı deterministik bir güvence.
  async findActiveForProduct(productId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { productId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: { items: true },
    });
    if (!bom) {
      throw new NotFoundException(`Ürün ${productId} için aktif bir ürün ağacı (BOM) bulunamadı`);
    }
    return bom;
  }

  async update(id: string, dto: UpdateBomDto) {
    const existing = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.billOfMaterial.updateMany({
          where: { productId: existing.productId, isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }
      return tx.billOfMaterial.update({
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
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.billOfMaterial.delete({ where: { id } });
  }
}
