import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto.js';

const ORDER_INCLUDE = { customer: true, items: { include: { product: true } } };

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSalesOrderDto) {
    return this.prisma.salesOrder.create({
      data: {
        customerId: dto.customerId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        note: dto.note,
        items: { create: dto.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })) },
      },
      include: ORDER_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.salesOrder.findMany({ include: ORDER_INCLUDE, orderBy: { orderDate: 'desc' } });
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException(`Satış siparişi ${id} bulunamadı`);
    }
    return order;
  }

  // Bir müşterinin sipariş geçmişi
  findByCustomer(customerId: string) {
    return this.prisma.salesOrder.findMany({
      where: { customerId },
      include: ORDER_INCLUDE,
      orderBy: { orderDate: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.salesOrder.update({ where: { id }, data: { status: dto.status }, include: ORDER_INCLUDE });
  }
}
