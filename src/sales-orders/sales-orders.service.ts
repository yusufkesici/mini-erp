import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto.js';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto.js';
import { UpdateSalesOrderItemDto } from './dto/update-sales-order-item.dto.js';
import type { SalesOrderStatus } from '../generated/prisma/enums.js';

const ORDER_INCLUDE = { customer: true, items: { include: { product: true } } };
const IMMUTABLE_STATUSES: SalesOrderStatus[] = ['COMPLETED', 'CANCELLED'];

// Durum makinesi: PENDING -> CONFIRMED -> COMPLETED, ikisinden de CANCELLED'a geçilebilir.
// COMPLETED/CANCELLED nihai durumlardır, buradan başka bir duruma geçiş yok.
const ALLOWED_STATUS_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> =
  {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly locationsService: LocationsService,
  ) {}

  create(dto: CreateSalesOrderDto) {
    return this.prisma.salesOrder.create({
      data: {
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        note: dto.note,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.salesOrder.findMany({
      include: ORDER_INCLUDE,
      orderBy: { orderDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
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
    const order = await this.findOne(id);
    if (!ALLOWED_STATUS_TRANSITIONS[order.status].includes(dto.status)) {
      throw new BadRequestException(
        `Sipariş ${order.status} durumundayken ${dto.status} durumuna geçirilemez`,
      );
    }

    // Sevkiyat anı: CONFIRMED -> COMPLETED geçişi. Durum güncellemesi + her kalem için
    // SALES_OUT stok hareketi tek transaction'da yürütülür — bir kalemde stok yetersizse
    // (applyMovement içindeki kontrol) sipariş durumu da değişmeden kalır, kısmi sevkiyat oluşmaz.
    if (order.status === 'CONFIRMED' && dto.status === 'COMPLETED') {
      // Satış siparişi de üretim emri gibi depo seviyesinde çalışır — raf seçimi yalnızca
      // barkod tarama ekranında zorunlu; sevkiyat hareketleri depo'nun otomatik "Genel Alan"
      // rafına yazılır (bkz. LocationsService.findDefaultForWarehouse).
      const location = await this.locationsService.findDefaultForWarehouse(
        order.warehouseId,
      );
      return this.prisma.$transaction(
        async (tx) => {
          const updated = await tx.salesOrder.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: ORDER_INCLUDE,
          });
          await this.stockMovementsService.createManyInTransaction(
            tx,
            order.items.map((item) => ({
              productId: item.productId,
              locationId: location.id,
              type: 'SALES_OUT' as const,
              quantity: Number(item.quantity),
              salesOrderItemId: item.id,
              note: `Satış siparişi ${order.id} sevkiyatı`,
            })),
          );
          return updated;
        },
        { isolationLevel: 'Serializable' },
      );
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateSalesOrderDto) {
    const order = await this.findOne(id);
    this.assertMutable(order.status);
    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        note: dto.note,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
      },
      include: ORDER_INCLUDE,
    });
  }

  // Yalnızca henüz onaylanmamış (PENDING) siparişler silinebilir — CONFIRMED/COMPLETED/CANCELLED
  // izlenebilirlik gereken kayıtlardır, bunun yerine iptal (CANCELLED) durumuna geçirilmelidir.
  async remove(id: string) {
    const order = await this.findOne(id);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Yalnızca beklemedeki (PENDING) siparişler silinebilir; onaylanmış bir siparişi iptal edin',
      );
    }
    return this.prisma.salesOrder.delete({ where: { id } });
  }

  async updateItem(
    orderId: string,
    itemId: string,
    dto: UpdateSalesOrderItemDto,
  ) {
    const order = await this.findOne(orderId);
    this.assertMutable(order.status);
    if (!order.items.some((item) => item.id === itemId)) {
      throw new NotFoundException(`Satış siparişi kalemi ${itemId} bulunamadı`);
    }
    await this.prisma.salesOrderItem.update({
      where: { id: itemId },
      data: dto,
    });
    return this.findOne(orderId);
  }

  async removeItem(orderId: string, itemId: string) {
    const order = await this.findOne(orderId);
    this.assertMutable(order.status);
    if (!order.items.some((item) => item.id === itemId)) {
      throw new NotFoundException(`Satış siparişi kalemi ${itemId} bulunamadı`);
    }
    if (order.items.length === 1) {
      throw new BadRequestException(
        'Siparişin son kalemi silinemez; bunun yerine siparişi iptal edin',
      );
    }
    await this.prisma.salesOrderItem.delete({ where: { id: itemId } });
    return this.findOne(orderId);
  }

  // Tamamlanmış/iptal edilmiş siparişler değiştirilemez — kalemler yalnızca PENDING/CONFIRMED durumunda güncellenebilir
  private assertMutable(status: SalesOrderStatus) {
    if (IMMUTABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Sipariş ${status} durumundayken kalemleri değiştirilemez`,
      );
    }
  }
}
