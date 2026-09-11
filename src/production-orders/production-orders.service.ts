import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillOfMaterialsService } from '../bill-of-materials/bill-of-materials.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { CreateProductionOrderDto } from './dto/create-production-order.dto.js';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto.js';
import { UpdateProductionOrderStatusDto } from './dto/update-production-order-status.dto.js';
import { CreateProductionReportDto } from './dto/create-production-report.dto.js';
import type { ProductionOrderStatus } from '../generated/prisma/enums.js';

// Durum makinesi: PLANNED -> IN_PROGRESS/COMPLETED, IN_PROGRESS -> COMPLETED; ikisinden de
// CANCELLED'a geçilebilir. CANCELLED nihai bir durumdur. COMPLETED ise IN_PROGRESS'e yeniden
// açılabilir: erken/yanlışlıkla COMPLETED işaretlenmiş bir emirde eksik kalan miktar için
// reportProduction() tekrar çağrılabilsin diye (reportProduction, COMPLETED durumundayken
// bildirim kabul etmez — bkz. aşağı; önce IN_PROGRESS'e geri alınması gerekir). CANCELLED'dan
// COMPLETED'e geçiş yine de reddedilir (bkz. SalesOrdersService'teki benzer desen).
const ALLOWED_STATUS_TRANSITIONS: Record<
  ProductionOrderStatus,
  ProductionOrderStatus[]
> = {
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: [],
};

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billOfMaterialsService: BillOfMaterialsService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly locationsService: LocationsService,
  ) {}

  async create(dto: CreateProductionOrderDto) {
    // BARCODE_MANUAL ürünler yalnızca fiziksel barkod taramasıyla depoya girer/çıkar —
    // hiçbir zaman üretim emriyle otomatik üretilemez (bkz. TrackingType enum tanımı,
    // schema.prisma). bomId elle verilse bile bu kontrol BOM aranmadan önce çalışır.
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { trackingType: true },
    });
    if (!product) {
      throw new NotFoundException(`Ürün ${dto.productId} bulunamadı`);
    }
    if (product.trackingType === 'BARCODE_MANUAL') {
      throw new BadRequestException(
        'BARCODE_MANUAL ürünler için üretim emri açılamaz — bu ürünler yalnızca barkod taramasıyla elle girilir/çıkarılır',
      );
    }

    // bomId verilmediyse ürünün o an geçerli (aktif) tarifini kullan
    const bomId =
      dto.bomId ??
      (await this.billOfMaterialsService.findActiveForProduct(dto.productId))
        .id;

    return this.prisma.productionOrder.create({
      data: {
        productId: dto.productId,
        bomId,
        warehouseId: dto.warehouseId,
        plannedQuantity: dto.plannedQuantity,
        plannedStartDate: dto.plannedStartDate
          ? new Date(dto.plannedStartDate)
          : undefined,
        plannedEndDate: dto.plannedEndDate
          ? new Date(dto.plannedEndDate)
          : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.productionOrder.findMany({
      include: { product: true, bom: true, warehouse: true },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        bom: { include: { items: true } },
        warehouse: true,
        movements: true,
      },
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
        plannedStartDate: dto.plannedStartDate
          ? new Date(dto.plannedStartDate)
          : undefined,
        plannedEndDate: dto.plannedEndDate
          ? new Date(dto.plannedEndDate)
          : undefined,
        actualStartDate: dto.actualStartDate
          ? new Date(dto.actualStartDate)
          : undefined,
        actualEndDate: dto.actualEndDate
          ? new Date(dto.actualEndDate)
          : undefined,
      },
    });
  }

  // Saf durum geçişi — hiçbir stok/BOM etkisi yok (bunlar reportProduction()'da). Eksik üretimle
  // (producedQuantity < plannedQuantity) COMPLETED'e çekmek de geçerlidir: kısmi/erken kapanış
  // meşru bir sonuçtur, kalan miktar için hiçbir şey olmaz.
  async updateStatus(id: string, dto: UpdateProductionOrderStatusDto) {
    const order = await this.findOne(id);
    if (!ALLOWED_STATUS_TRANSITIONS[order.status].includes(dto.status)) {
      throw new BadRequestException(
        `Üretim emri ${order.status} durumundayken ${dto.status} durumuna geçirilemez`,
      );
    }
    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // Aşamalı üretim bildirimi: PLANNED/IN_PROGRESS iken tekrar tekrar çağrılabilir. Her çağrı,
  // o anki `quantity` ARTIŞI için (toplam değil) BOM'u emrin oluşturulduğu anda sabitlenmiş
  // bomId üzerinden özyinelemeli patlatır, yalnızca yaprak (ham madde) bileşenleri
  // PRODUCTION_CONSUME_OUT ile düşer, üretilen ürünü PRODUCTION_IN ile stoğa ekler,
  // producedQuantity'yi increment eder — tümü tek Serializable transaction içinde (bkz.
  // SalesOrdersService.updateStatus CONFIRMED->COMPLETED). Ara mamuller (isLeaf:false) stoktan
  // düşülmez: özyinelemeli patlatma modeli, bu emrin tüm alt montajları da o anda "sanal" olarak
  // ürettiğini varsayar. İlk bildirimde PLANNED -> IN_PROGRESS'e otomatik geçer. plannedQuantity
  // üst sınır değildir (fazla üretime izin var, reddedilmez). Bir bileşende stok yetersizse
  // applyMovement BadRequestException fırlatır; interactive $transaction içinde olduğundan hiçbir
  // şey commit edilmez.
  async reportProduction(id: string, dto: CreateProductionReportDto) {
    const order = await this.findOne(id);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException(
        `Üretim emri ${order.status} durumundayken üretim bildirimi yapılamaz`,
      );
    }

    const { lines } = await this.billOfMaterialsService.explodeForBom(
      order.bomId,
      dto.quantity,
    );
    const componentLines = lines.filter((line) => line.isLeaf);
    // Üretim emri hâlâ depo seviyesinde çalışır (kullanıcı kararı — raf seçimi yalnızca
    // barkod tarama ekranında zorunlu); stok hareketleri o depo'nun otomatik "Genel Alan"
    // rafına yazılır (bkz. LocationsService.findDefaultForWarehouse).
    const location = await this.locationsService.findDefaultForWarehouse(
      order.warehouseId,
    );

    return this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.productionOrder.update({
          where: { id },
          data: {
            producedQuantity: { increment: dto.quantity },
            status: order.status === 'PLANNED' ? 'IN_PROGRESS' : undefined,
          },
        });
        await this.stockMovementsService.createManyInTransaction(tx, [
          ...componentLines.map((line) => ({
            productId: line.productId,
            locationId: location.id,
            type: 'PRODUCTION_CONSUME_OUT' as const,
            quantity: line.quantity,
            productionOrderId: id,
            note: `Üretim emri ${id} — kısmi üretim bildirimi (${dto.quantity} adet) için tüketilen bileşen (${line.productCode})`,
          })),
          {
            productId: order.productId,
            locationId: location.id,
            type: 'PRODUCTION_IN' as const,
            quantity: dto.quantity,
            productionOrderId: id,
            note: `Üretim emri ${id} — kısmi üretim bildirimi (${dto.quantity} adet)`,
          },
        ]);
        return updated;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productionOrder.delete({ where: { id } });
  }
}
