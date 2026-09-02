import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillOfMaterialsService } from '../bill-of-materials/bill-of-materials.service.js';
import { CreateProductionOrderDto } from './dto/create-production-order.dto.js';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto.js';

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billOfMaterialsService: BillOfMaterialsService,
  ) {}

  async create(dto: CreateProductionOrderDto) {
    // bomId verilmediyse ürünün o an geçerli (aktif) tarifini kullan
    const bomId = dto.bomId ?? (await this.billOfMaterialsService.findActiveForProduct(dto.productId)).id;

    return this.prisma.productionOrder.create({
      data: {
        productId: dto.productId,
        bomId,
        warehouseId: dto.warehouseId,
        plannedQuantity: dto.plannedQuantity,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.productionOrder.findMany({ include: { product: true, bom: true, warehouse: true } });
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { product: true, bom: { include: { items: true } }, warehouse: true, movements: true },
    });
    if (!order) {
      throw new NotFoundException(`Üretim emri ${id} bulunamadı`);
    }
    return order;
  }

  async update(id: string, dto: UpdateProductionOrderDto) {
    await this.findOne(id);
    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        status: dto.status,
        producedQuantity: dto.producedQuantity,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
        actualStartDate: dto.actualStartDate ? new Date(dto.actualStartDate) : undefined,
        actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productionOrder.delete({ where: { id } });
  }
}
