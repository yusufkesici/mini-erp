import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto.js';
import { UpdateSalesOrderItemDto } from './dto/update-sales-order-item.dto.js';
import type { SalesOrderStatus } from '../generated/prisma/enums.js';

const ORDER_INCLUDE = { customer: true, items: { include: { product: true } } };
const IMMUTABLE_STATUSES: SalesOrderStatus[] = ['COMPLETED', 'CANCELLED'];

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

  async updateItem(orderId: string, itemId: string, dto: UpdateSalesOrderItemDto) {
    const order = await this.findOne(orderId);
    this.assertMutable(order.status);
    if (!order.items.some((item) => item.id === itemId)) {
      throw new NotFoundException(`Satış siparişi kalemi ${itemId} bulunamadı`);
    }
    await this.prisma.salesOrderItem.update({ where: { id: itemId }, data: dto });
    return this.findOne(orderId);
  }

  async removeItem(orderId: string, itemId: string) {
    const order = await this.findOne(orderId);
    this.assertMutable(order.status);
    if (!order.items.some((item) => item.id === itemId)) {
      throw new NotFoundException(`Satış siparişi kalemi ${itemId} bulunamadı`);
    }
    if (order.items.length === 1) {
      throw new BadRequestException('Siparişin son kalemi silinemez; bunun yerine siparişi iptal edin');
    }
    await this.prisma.salesOrderItem.delete({ where: { id: itemId } });
    return this.findOne(orderId);
  }

  // Tamamlanmış/iptal edilmiş siparişler değiştirilemez — kalemler yalnızca PENDING/CONFIRMED durumunda güncellenebilir
  private assertMutable(status: SalesOrderStatus) {
    if (IMMUTABLE_STATUSES.includes(status)) {
      throw new BadRequestException(`Sipariş ${status} durumundayken kalemleri değiştirilemez`);
    }
  }
}
